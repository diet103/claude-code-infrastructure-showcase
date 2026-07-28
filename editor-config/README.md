# NeoVim / Vim Config for Claude Code

Configuration optimized for Claude Code's prompt editing mode (`Ctrl+G` or `/vim`).

## Files

| File | Target Location | Purpose |
|------|----------------|---------|
| `init.lua` | `~/.config/nvim/init.lua` | NeoVim config (primary) |
| `vimrc` | `~/.vimrc` | Vim fallback (simpler) |

## Installation

The setup wizard (`npx tsx setup.ts`) can install these automatically. Or manually:

```bash
# NeoVim (recommended)
mkdir -p ~/.config/nvim
cp editor-config/init.lua ~/.config/nvim/init.lua
echo 'export EDITOR=nvim' >> ~/.bashrc
source ~/.bashrc

# Vim fallback (if NeoVim not available)
cp editor-config/vimrc ~/.vimrc
echo 'export EDITOR=vim' >> ~/.bashrc
source ~/.bashrc
```

## What's Configured

### NeoVim (`init.lua`)

**Display:**
- Relative line numbers (easy `5j` jumping)
- Word-boundary wrapping (long prompts wrap at words, not mid-character)
- Wrapped lines keep their indent
- 8-line scroll margin

**Editing:**
- 2-space indentation
- System clipboard integration (yank = Cmd+C / Ctrl+C)
- Persistent undo history
- No swap/backup files

**Key Bindings (Space = leader):**

| Key | Mode | Action |
|-----|------|--------|
| `Space+w` | Normal | Save and quit (submit prompt) |
| `Space+q` | Normal | Quit without saving (cancel) |
| `Esc` | Normal | Clear search highlight |
| `J` / `K` | Visual | Move selected lines down/up |
| `Ctrl+d` | Normal | Scroll down (cursor centered) |
| `Ctrl+u` | Normal | Scroll up (cursor centered) |
| `Space+a` | Normal | Select all |
| `Space+p` | Visual | Paste without overwriting register |

### Vim (`vimrc`)

Simpler fallback: 4-space tabs, syntax highlighting, search settings, cursor line highlight.

## How It Works with Claude Code

Claude Code uses the `$EDITOR` environment variable to determine which editor opens when you:
- Press `Ctrl+G` to edit your prompt in a full editor
- Use `/vim` mode for multi-line editing

Setting `EDITOR=nvim` makes Claude Code open NeoVim with your `init.lua` config. The `Space+w` binding makes the workflow: edit prompt → `Space+w` → prompt submitted.
