# Sequence Diagram

```mermaid
sequenceDiagram
User->>Agent: Request
Agent->>Context Engine: Resolve files
Context Engine->>Prompt Engine: Variables
Prompt Engine->>Provider: Final prompt
Provider-->>Agent: Response
Agent-->>User: Output
```
