# JLPT Test System - Implementation Plan

## Overview
Rebuild the JLPT test interface with:
- Admin can create/manage JLPT tests by level (N5-N1)
- Standard JLPT structure: 文字・語彙, 文法, 読解, 聴解
- Timer countdown, fullscreen mode
- Answers with explanations

## Files to Create/Modify

### 1. NEW: `src/components/screens/JLPTTestScreen.jsx`
- Main JLPT test hub - browse tests by level
- Test taking UI with timer + fullscreen
- All JLPT sections including listening
- Result screen with review

### 2. NEW: `src/components/screens/JLPTAdminScreen.jsx`  
- Admin panel for creating/editing JLPT tests
- JSON-based test creation form
- Test structure editor

### 3. MODIFY: `src/router/index.jsx`
- Add JLPT_TEST and JLPT_ADMIN routes

### 4. MODIFY: `src/components/AppRoutes.jsx`
- Add routes for JLPTTestScreen and JLPTAdminScreen

### 5. MODIFY: `src/components/screens/index.js`
- Export new screens

## Firebase Structure
```
artifacts/{appId}/jlptTests/{testId}
  - title: string
  - level: "N5" | "N4" | "N3" | "N2" | "N1"
  - timeLimit: number (minutes)
  - sections: [
    {
      type: "vocabulary" | "grammar" | "reading" | "listening"
      title: string
      questions: [
        {
          question: string
          audioUrl?: string (for listening)
          passage?: string (for reading)
          options: string[]
          correctAnswer: number (0-3 index)
          explanation: string
        }
      ]
    }
  ]
  - createdAt: timestamp
  - createdBy: string
```
