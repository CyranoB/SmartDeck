# AI Flashcard Generator

A modern web application that automatically generates study flashcards from course transcripts using OpenAI GPT-4o Mini. Built with Next.js 15, TypeScript, and Tailwind CSS.

## Features

- 📝 **Transcript Upload**: Upload course transcripts (max 50 words per file) in plain text format
- 🤖 **AI-Powered Analysis**: Automatically generates course subjects and detailed outlines without manual input
- 🎴 **Smart Flashcards**: Creates study-optimized flashcards with simple navigation controls
- 🌐 **Multilingual Interface**: Supports both English and French
- 🎨 **Modern UI**: Clean, responsive design using shadcn components
- ⚡ **Real-time Processing**: Visual feedback during AI analysis with progress indicators
- 📱 **Mobile Responsive**: Optimized for both desktop and mobile devices

## Getting Started

### Prerequisites

- Node.js 18.x or later
- pnpm (recommended) or npm
- OpenAI API key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/flash_cards.git
   cd flash_cards
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Copy the example environment file and configure your settings:
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your OpenAI API key and preferred settings:
   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4o-mini
   OPENAI_BASE_URL=https://api.openai.com/v1
   ```

4. Start the development server:
   ```bash
   pnpm dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Configuration

- Set your OpenAI API key and model in the `.env.local` file
- Choose your preferred interface language (English/French)
- Customize theme settings (light/dark mode)

## Usage

1. **Upload Transcript**
   - Drag and drop your plain text file or use the file browser
   - Maximum file size: 50 words
   - Files are processed locally for privacy

2. **Processing**
   - The AI will analyze your transcript
   - Progress indicators show analysis status
   - Wait for the processing to complete

3. **Study**
   - Navigate through generated flashcards
   - Use "Next" to view more cards
   - "Stop" to see session summary
   - Return to upload screen when finished

## Tech Stack

- **Framework**: Next.js 15.1.0 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3.4
- **UI Components**: shadcn/ui with Radix UI primitives
- **AI Integration**: OpenAI GPT-4o Mini via @ai-sdk/openai
- **State Management**: React Context + React Hook Form
- **Testing**: Built-in test suite
- **Deployment**: Vercel (recommended)

## Project Structure

```
flash_cards/
├── app/                    # Next.js 15 App Router
│   ├── api/               # API routes
│   ├── config/            # App configuration
│   ├── processing/        # Processing page
│   ├── results/          # Results display
│   ├── flashcards/       # Flashcards interface
│   └── summary/          # Session summary
├── components/            # React components
├── hooks/                # Custom React hooks
├── lib/                  # Utility functions
├── public/              # Static assets
├── styles/              # Global styles
├── test/               # Test suite
└── documentation/      # Project documentation
```

## Development

### Commands

- `pnpm dev`: Start development server
- `pnpm build`: Build for production
- `pnpm start`: Start production server
- `pnpm lint`: Run ESLint

### Best Practices

- Use TypeScript for type safety
- Follow Next.js 15 App Router conventions
- Implement proper client/server component separation
- Handle SSR hydration carefully
- Use proper error boundaries and loading states
- Keep sensitive data in environment variables
- Follow the project rules for file structure and routing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- AI powered by [OpenAI](https://openai.com/) 