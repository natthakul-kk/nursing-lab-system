# System Rules: Direct Execution (No Interactive Questions)

## User Interaction Policy
1. **Never use interactive popup questions (`ask_question` tool)**:
   - Do NOT prompt the user with interactive choice modals, multiple-choice questions, or clarifying popups.
   - Proceed directly with the best technical decision, plan, implement, build-test, and commit.
2. **Execute autonomously**:
   - When the user asks for changes, fixes, or additions, research the codebase, apply the changes, verify with `npm run build` / `npx tsc`, and commit directly.
   - If there are minor design options, choose the most sensible and standard approach, apply it, and summarize the choice in the final response.
3. **Safety exception only**:
   - Only pause and ask if the action would result in catastrophic data destruction (e.g. dropping the entire production database without backup). Otherwise, always proceed directly.
4. **Never touch or save files to the User's Desktop (`C:\Users\...\Desktop`)**:
   - Strictly keep ALL generated files, exports, documents, diagrams, and assets inside the project repository `d:\LAB-system\` (e.g., `d:\LAB-system\system_flow\`, `d:\LAB-system\manual\`).
   - Never place, copy, or move files to the Desktop or any user folders outside `d:\LAB-system`.
