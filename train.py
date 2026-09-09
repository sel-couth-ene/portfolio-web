# train.py
#
# Fine-tunes a small open model (Phi-4-mini-instruct, 3.8B) on Selene's
# background Q&A dataset using LoRA + Unsloth (fast, memory-efficient,
# runs on a free Google Colab T4 GPU).
#
# Why Phi-4-mini-instruct instead of Llama-3.2-3B: similar size/footprint,
# but a newer Microsoft release with materially better instruction-following
# and reasoning benchmarks at the same ~3.8B scale — a better base for a
# Q&A-style assistant. It quantizes to roughly the same GGUF footprint
# (~2.2-2.5GB at Q4_K_M), so it fits the same serving budget on the Oracle
# VM (2 OCPU / 12GB RAM, Always Free Ampere A1 as of mid-2026).
#
# HOW TO RUN:
#   1. Open https://colab.research.google.com
#   2. Runtime -> Change runtime type -> T4 GPU (free tier)
#   3. Upload training_data.jsonl to the Colab session (left sidebar -> Files -> upload)
#   4. Paste this whole script into a cell (or upload as train.py and `!python train.py`)
#   5. Run it. On a free T4, this dataset size (150-300 examples) takes
#      roughly 10-25 minutes.
#
# Output: a LoRA adapter saved to ./selene-lora, plus a merged, quantized
# GGUF file ready for Ollama / llama.cpp.

# ---- 1. Install dependencies (Colab only needs this once per session) ----
# !pip install -q unsloth
# !pip install -q --no-deps trl peft accelerate bitsandbytes

from unsloth import FastLanguageModel
import torch
from datasets import load_dataset
from trl import SFTTrainer, SFTConfig

MAX_SEQ_LENGTH = 1024
# Unsloth's "-unsloth-bnb-4bit" variant is their dynamic quant (selectively
# skips quantizing certain sensitive layers), which is what Unsloth's own
# Phi-4 docs recommend over the plain "-bnb-4bit" checkpoint for better
# accuracy at basically the same VRAM cost.
BASE_MODEL = "unsloth/Phi-4-mini-instruct-unsloth-bnb-4bit"

# ---- 2. Load base model in 4-bit (fits comfortably on a free T4) ----
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=BASE_MODEL,
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,          # auto-detect
    load_in_4bit=True,
)

# ---- 3. Attach a small LoRA adapter (we only train ~1% of parameters) ----
# NOTE: Phi-4-mini's HF implementation fuses q/k/v into "qkv_proj" and
# gate/up into "gate_up_proj" internally, but Unsloth's patched loader
# still accepts and correctly maps these standard target_modules names
# under the hood (it reports something like "patched 40 QKV layers, 40 O
# layers, 40 MLP layers" on load) — no change needed here vs. the Llama setup.
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                     "gate_proj", "up_proj", "down_proj"],
    lora_alpha=16,
    lora_dropout=0,
    bias="none",
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# ---- 4. Load and format the dataset ----
# training_data.jsonl rows look like:
# {"messages": [{"role":"system",...}, {"role":"user",...}, {"role":"assistant",...}]}
dataset = load_dataset("json", data_files="training_data.jsonl", split="train")

def format_chat(example):
    text = tokenizer.apply_chat_template(
        example["messages"], tokenize=False, add_generation_prompt=False
    )
    return {"text": text}

dataset = dataset.map(format_chat)

# ---- 5. Train ----
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=dataset,
    dataset_text_field="text",
    max_seq_length=MAX_SEQ_LENGTH,
    args=SFTConfig(
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=5,
        num_train_epochs=3,       # 150-300 examples -> 3 epochs is still plenty; drop to 2 if train loss falls but answers get repetitive/verbatim
        learning_rate=2e-4,
        fp16=not torch.cuda.is_bf16_supported(),
        bf16=torch.cuda.is_bf16_supported(),
        logging_steps=5,
        optim="adamw_8bit",
        weight_decay=0.01,
        lr_scheduler_type="linear",
        seed=42,
        output_dir="outputs",
    ),
)

trainer.train()

# ---- 6. Save the LoRA adapter ----
model.save_pretrained("selene-lora")
tokenizer.save_pretrained("selene-lora")

# ---- 7. Export merged model as GGUF for Ollama / llama.cpp ----
# "q4_k_m" is a good quality/size tradeoff for a 3.8B model (~2.2-2.5GB file,
# comfortably within the Oracle VM's 12GB RAM alongside Ollama + OS overhead).
model.save_pretrained_gguf("selene-gguf", tokenizer, quantization_method="q4_k_m")

print("Done. LoRA adapter in ./selene-lora, GGUF model in ./selene-gguf")
print("Download the .gguf file from the Colab file browser before the session ends.")
