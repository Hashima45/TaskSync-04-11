# TaskSync Frontend - Copilot Instructions

## Project Overview
TaskSync is an intelligent, web-based task management application leveraging AI and adaptive algorithms for intelligent task recommendations, smart scheduling, and priority management.

## Project Type & Stack
- **Project Type**: React Frontend
- **Framework**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Custom + Headless UI
- **State Management**: Zustand/Context API
- **AI Features**: Task recommendations, smart scheduling, adaptive algorithms

## Development Setup Checklist

- [x] Verify that the copilot-instructions.md file in the .github directory is created.

- [x] Clarify Project Requirements
  - React-based frontend for intelligent task management
  - AI-driven task recommendations and scheduling
  - Responsive design for desktop and mobile

- [x] Scaffold the Project
  - Created React + TypeScript + Vite project structure

- [x] Customize the Project
  - Developed TaskSync-specific components and features
  - Implemented AI mock algorithms for task recommendations
  - Created responsive layout and navigation

- [x] Install Required Extensions
  - No additional extensions needed

- [x] Compile the Project
  - All dependencies installed
  - Project builds successfully without errors

- [x] Create and Run Task
  - Dev server task created and running

- [x] Launch the Project
  - Development server running at http://localhost:3000

- [x] Ensure Documentation is Complete
  - README.md maintained with current project information
  - copilot-instructions.md updated with completion status

## Key Features Implemented
1. ✅ Dashboard with task overview and statistics
2. ✅ Intelligent task recommendations based on urgency
3. ✅ Smart task card interface with status management
4. ✅ Priority management with color-coded badges
5. ✅ Task filtering by status (all, todo, in-progress, completed, blocked)
6. ✅ Responsive UI for desktop and mobile devices
7. ✅ Task timeline showing upcoming deadlines
8. ✅ AI Recommendations panel with confidence scoring
9. ✅ Task form modal for creating and editing tasks
10. ✅ Real-time dashboard statistics

## Running the Application

### Development Mode
```bash
npm run dev
```
Opens automatically at http://localhost:3000

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Project Structure
```
src/
├── components/           # React UI components
├── pages/               # Page components
├── services/            # AI algorithms and business logic
├── store/               # Zustand state management
├── types/               # TypeScript definitions
├── utils/               # Helper functions
├── App.tsx              # Main app component
├── main.tsx             # React entry point
└── index.css            # Global styles
```
