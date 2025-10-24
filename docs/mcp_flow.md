# MCP Flow Documentation

## Model Context Protocol Integration

### Flow Diagram
```
Extension (popup.js)
    ↓
background.js (service worker)
    ↓
MCP Client
    ↓
MCP Server
    ↓
Claude API
```

## Request/Response Flow
1. User triggers action in popup
2. Message sent to background worker
3. MCP client formats request
4. Server processes and routes to Claude
5. Results streamed back to extension
6. UI updated with synthesis results

## Implementation Details
- [ ] Define message protocol
- [ ] Implement MCP client
- [ ] Configure API authentication
- [ ] Add error handling
