-- =============================================================================
-- NeoVim Config for Claude Code Prompt Editing
-- =============================================================================

-- LINE NUMBERS
vim.opt.number = true              -- Show line numbers
vim.opt.relativenumber = true      -- Relative numbers (shows distance from cursor)
                                   -- Great for jumping: 5j goes down 5 lines

-- INDENTATION
vim.opt.tabstop = 2                -- Tab = 2 spaces
vim.opt.shiftwidth = 2             -- Indent = 2 spaces
vim.opt.expandtab = true           -- Use spaces, not tabs
vim.opt.autoindent = true          -- Keep indent level on new lines
vim.opt.smartindent = true         -- Smart indent for code blocks

-- TEXT WRAPPING (important for long prompts)
vim.opt.wrap = true                -- Wrap long lines visually
vim.opt.linebreak = true           -- Wrap at word boundaries, not mid-word
vim.opt.breakindent = true         -- Wrapped lines keep their indent

-- SEARCH
vim.opt.ignorecase = true          -- Case insensitive search
vim.opt.smartcase = true           -- Unless you type a capital
vim.opt.hlsearch = true            -- Highlight search results
vim.opt.incsearch = true           -- Show matches as you type

-- CLIPBOARD (use system clipboard)
vim.opt.clipboard = "unnamedplus"  -- Yank/paste works with Cmd+C/Cmd+V

-- VISUAL COMFORT
vim.opt.scrolloff = 8              -- Keep 8 lines visible above/below cursor
vim.opt.sidescrolloff = 8          -- Keep 8 columns visible left/right
vim.opt.cursorline = true          -- Highlight current line
vim.opt.termguicolors = true       -- Better colors
vim.opt.signcolumn = "yes"         -- Consistent gutter width

-- BEHAVIOR
vim.opt.mouse = "a"                -- Mouse works if you want it
vim.opt.undofile = true            -- Persistent undo history
vim.opt.updatetime = 250           -- Faster updates
vim.opt.timeoutlen = 300           -- Faster key sequence completion

-- REMOVE ANNOYING THINGS
vim.opt.swapfile = false           -- No swap files
vim.opt.backup = false             -- No backup files
vim.opt.errorbells = false         -- No error sounds

-- =============================================================================
-- KEYMAPS
-- =============================================================================

-- Set leader key to space
vim.g.mapleader = " "

-- Quick save and quit (main workflow for prompt editing)
vim.keymap.set("n", "<leader>w", ":wq<CR>", { desc = "Save and quit" })
vim.keymap.set("n", "<leader>q", ":q!<CR>", { desc = "Quit without saving" })

-- Clear search highlight
vim.keymap.set("n", "<Esc>", ":nohlsearch<CR>", { desc = "Clear search highlight" })

-- Move lines up/down in visual mode
vim.keymap.set("v", "J", ":m '>+1<CR>gv=gv", { desc = "Move selection down" })
vim.keymap.set("v", "K", ":m '<-2<CR>gv=gv", { desc = "Move selection up" })

-- Keep cursor centered when scrolling
vim.keymap.set("n", "<C-d>", "<C-d>zz", { desc = "Scroll down centered" })
vim.keymap.set("n", "<C-u>", "<C-u>zz", { desc = "Scroll up centered" })

-- Keep cursor centered when searching
vim.keymap.set("n", "n", "nzzzv", { desc = "Next search result centered" })
vim.keymap.set("n", "N", "Nzzzv", { desc = "Prev search result centered" })

-- Better paste (don't overwrite register when pasting over selection)
vim.keymap.set("x", "<leader>p", '"_dP', { desc = "Paste without yanking" })

-- Select all
vim.keymap.set("n", "<leader>a", "ggVG", { desc = "Select all" })