🧠 SynthX – Your On-Chain AI Copilot
⚡ Overview

SynthX is a Chrome extension that transforms any blockchain explorer — especially Blockscout — into an intelligent, AI-powered investigation tool.
By combining Claude’s natural-language reasoning with Blockscout MCP’s real on-chain data, SynthX explains wallet activity, token transfers, and contract calls directly inside the browser — no extra dashboards, no mock data.

💡 Core Idea

Most blockchain explorers show data that’s unreadable to everyday users.
SynthX bridges that gap by detecting the page you’re viewing and generating human-readable summaries like:

“This wallet is a DeFi trader active on Uniswap and Aave.
Last transaction swapped 2 ETH for 7,500 USDC using a verified router contract.
Gas cost ≈ $4.21.”

🔍 Key Features
Feature	Description
Auto URL Detection	Automatically detects when you visit a Blockscout page (/address/, /tx/, /token/).
Claude-Powered Explanations	Uses Claude API to turn complex transaction JSON into natural-language summaries.
Blockscout MCP Integration	Fetches verified on-chain data via the official MCP server — accurate, real-time, multi-chain.
Inline Overlay UI	Displays AI insights right on the explorer page, without leaving your tab.
Interactive Q&A	Users can ask follow-up questions like “Was this a rug pull?” or “What token was traded?”
Lightweight & Secure	Runs entirely client-side with no custody or wallet permissions.
🧰 Architecture

Manifest V3 Chrome Extension

Content Script → Detects current page and injects overlay

Background Service Worker → Calls Blockscout MCP + Claude API

Popup UI (Tailwind + Vanilla JS) → Displays summaries and Q&A

Claude Prompt Engine → Converts structured on-chain data to natural explanations

🧩 Example Flow

User opens https://eth.blockscout.com/tx/0x...

SynthX detects the transaction hash

Fetches decoded transaction data from Blockscout MCP

Sends structured JSON to Claude

Displays:

“User swapped 1 ETH for 3,250 USDC on Uniswap v3 via exactInputSingle().
Contract verified ✅ | Gas $2.78 | No risk flags detected.”

🏁 Why It Matters

Makes blockchain human-readable.

Demonstrates real agentic reasoning (Claude + MCP).

Fully functional in a browser context — not just another dashboard.

Bridges the gap between AI understanding and on-chain transparency.

🧠 Tagline

“SynthX — Read the blockchain like a human.”