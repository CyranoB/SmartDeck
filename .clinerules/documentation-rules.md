## Brief overview
This set of guidelines covers documentation standards for the SmartDeck flashcard application. These rules ensure that documentation remains comprehensive, up-to-date, and aligned with the actual implementation of the AI-powered study companion.

## Documentation Requirements
-   Update relevant documentation in /docs when modifying features
-   Keep README.md in sync with new capabilities
-   Maintain changelog entries in CHANGELOG.md

## Documentation structure
- Maintain comprehensive documentation in the docs/ directory
- Use memory-bank/ directory for high-level project context and progress tracking
- Structure documentation with clear headings and sections
- Include "Key Points" section at the beginning of each document for quick reference
- Use markdown tables for structured information
- Include visual diagrams using ASCII art or markdown code blocks for architecture

## When to update documentation
- Update documentation when implementing major architectural changes
- Document new API endpoints or changes to existing endpoints
- Update when modifying the application flow or user journey
- Revise when adding new features or modifying existing functionality
- Update memory-bank files after significant development milestones
- Document changes to the tech stack or dependencies
- Update configuration documentation when environment variables change

## Documentation standards
- Use markdown format for all documentation files
- Include descriptive headings with proper hierarchy (H1, H2, H3)
- Provide code examples where appropriate
- Use consistent terminology across all documentation
- Keep language clear and concise
- Include diagrams for complex workflows or architecture
- Document API endpoints with request/response examples
- Maintain up-to-date directory structure documentation

## Memory bank updates
- Update activeContext.md with current work focus and recent changes
- Revise progress.md to reflect completed features and remaining tasks
- Update systemPatterns.md when architectural patterns change
- Modify techContext.md when adding or removing technologies
- Ensure projectbrief.md remains aligned with current project goals
- Update productContext.md when user experience goals change

## Technical documentation
- Document API architecture with clear component responsibilities
- Include error handling strategies in technical documentation
- Document state management approaches and data flow
- Provide detailed information about third-party integrations
- Include security and performance considerations
- Document configuration options and environment variables
- Maintain up-to-date information about deployment procedures

## Architecture Decision Records
Create ADRs in /docs/adr for:
    -   Major dependency changes
    -   Architectural pattern changes
    -   New integration patterns
    -   Database schema changes
