# QuizKi App - Refactoring Guide

## ✅ Refactoring Status: COMPLETE! 🎉

**App.jsx has been fully refactored:**
- ✅ Phase 1: Added imports from refactored modules (config, utils, components)
- ✅ Phase 2: Removed all inline component definitions
- ✅ File reduced from **8,364 lines** to **2,260 lines** (73% reduction!)
- ✅ Removed ~6,100 lines of duplicate/inline code
- ✅ 35+ components extracted to separate files

## 📁 Cấu trúc thư mục mới

```
src/
├── components/
│   ├── index.js                    ✅
│   ├── CardItem.jsx                (existing)
│   ├── ErrorBoundary.jsx           (existing)
│   ├── VirtualizedGrid.jsx         (existing)
│   │
│   ├── cards/
│   │   ├── index.js                ✅
│   │   ├── ActionCard.jsx          ✅
│   │   ├── MemoryStatCard.jsx      ✅
│   │   ├── AddCardForm.jsx         ✅
│   │   └── EditCardForm.jsx        ✅
│   │
│   ├── layout/
│   │   ├── index.js                ✅
│   │   └── Sidebar.jsx             ✅
│   │
│   ├── screens/
│   │   ├── index.js                ✅
│   │   ├── HomeScreen.jsx          ✅ (dashboard chính)
│   │   ├── LoginScreen.jsx         ✅ (đăng nhập/đăng ký)
│   │   ├── PaymentScreen.jsx       ✅ (thanh toán)
│   │   ├── AccountScreen.jsx       ✅ (cài đặt tài khoản)
│   │   ├── ProfileScreen.jsx       ✅ (profile setup - first time)
│   │   ├── HelpScreen.jsx          ✅ (hướng dẫn nhanh)
│   │   ├── ImportScreen.jsx        ✅ (nhập từ TSV)
│   │   ├── StatsScreen.jsx         ✅ (thống kê với charts)
│   │   ├── FriendsScreen.jsx       ✅ (bảng xếp hạng)
│   │   ├── ListView.jsx            ✅ (danh sách từ vựng với filters)
│   │   ├── ReviewScreen.jsx        ✅ (ôn tập từ vựng)
│   │   ├── StudyScreen.jsx         ✅ (học từ mới)
│   │   └── TestScreen.jsx          ✅ (luyện thi JLPT)
│   │
│   └── ui/
│       ├── index.js                ✅
│       ├── SearchInput.jsx         ✅
│       └── SrsStatusCell.jsx       ✅
│
├── config/
│   ├── index.js                    ✅
│   ├── constants.js                ✅
│   └── firebase.js                 ✅
│
├── utils/
│   ├── index.js                    ✅
│   ├── audio.js                    ✅
│   ├── gemini.js                   ✅
│   ├── image.js                    ✅
│   ├── srs.js                      ✅
│   ├── textProcessing.js           ✅
│   └── queryClient.js              ✅
│
└── App.jsx                         ✅ (fully refactored - 2260 lines)
```

## ✅ Đã hoàn thành (35+ files)

### Config (3 files)
- `constants.js` - POS types, JLPT levels, SRS intervals, helpers
- `firebase.js` - Firebase initialization
- `index.js` - exports

### Utils (7 files)
- `audio.js` - Audio playback (playAudio, pcmToWav, base64ToArrayBuffer)
- `srs.js` - SRS calculations (getNextReviewDate, getSrsProgressText)
- `textProcessing.js` - Text masking, shuffling, normalizing
- `gemini.js` - AI API calls (TTS, generateVocabWithAI)
- `image.js` - Image compression
- `queryClient.js` - React Query client
- `index.js` - exports

### Layout (2 files)
- `Sidebar.jsx` - Navigation sidebar (mobile + desktop)
- `index.js` - exports

### Cards (5 files)
- `ActionCard.jsx` - Glass effect action buttons cho HomeScreen
- `MemoryStatCard.jsx` - Memory statistics cards
- `AddCardForm.jsx` - Form thêm từ mới với AI, audio, image upload
- `EditCardForm.jsx` - Form chỉnh sửa từ với AI
- `index.js` - exports

### UI (3 files)
- `SearchInput.jsx` - Optimized search input with debounce
- `SrsStatusCell.jsx` - SRS status display cell
- `index.js` - exports

### Screens (14 files)
- `HomeScreen.jsx` - Main dashboard với stats và action cards
- `LoginScreen.jsx` - Login/Register với email verification
- `PaymentScreen.jsx` - Payment processing
- `AccountScreen.jsx` - Account settings, password change
- `ProfileScreen.jsx` - Profile setup (first time user)
- `HelpScreen.jsx` - Quick tips và shortcuts
- `ImportScreen.jsx` - TSV import functionality
- `StatsScreen.jsx` - Statistics với PieChart và BarChart
- `FriendsScreen.jsx` - Leaderboard
- `ListView.jsx` - Vocabulary list với filters, sorting, editing
- `ReviewScreen.jsx` - Review mode (flashcard, synonym, example, back)
- `StudyScreen.jsx` - Study mode với multiple choice và typing
- `TestScreen.jsx` - JLPT test mode (Kanji, Vocab, Grammar)
- `index.js` - exports

## 📋 Cách sử dụng các component mới trong App.jsx

### 1. Thêm imports ở đầu file App.jsx:

```javascript
// Thêm imports từ các module đã tách
import { 
    HomeScreen, 
    LoginScreen, 
    PaymentScreen, 
    AccountScreen, 
    ProfileScreen, 
    HelpScreen, 
    ImportScreen, 
    StatsScreen, 
    FriendsScreen, 
    ListView, 
    ReviewScreen, 
    ReviewCompleteScreen,
    StudyScreen, 
    TestScreen 
} from './components/screens';

import { Sidebar } from './components/layout';

import { 
    ActionCard, 
    MemoryStatCard, 
    AddCardForm, 
    EditCardForm 
} from './components/cards';

import { SearchInput, SrsStatusCell } from './components/ui';

import { 
    POS_TYPES, 
    JLPT_LEVELS, 
    SRS_INTERVALS,
    getPosLabel, 
    getPosColor, 
    getLevelColor 
} from './config/constants';

import { app, db, auth, appId } from './config/firebase';

import { playAudio, pcmToWav, base64ToArrayBuffer } from './utils/audio';
import { getNextReviewDate, getSrsProgressText } from './utils/srs';
import { 
    shuffleArray, 
    maskWordInExample, 
    getWordForMasking, 
    getSpeechText,
    normalizeAnswer,
    buildAdjNaAcceptedAnswers 
} from './utils/textProcessing';
import { fetchTtsBase64, generateVocabWithAI, getAllGeminiApiKeysFromEnv } from './utils/gemini';
import { compressImage } from './utils/image';
```

### 2. Xóa các định nghĩa duplicate trong App.jsx:

- Xóa `const POS_TYPES = {...}` (line ~36-47)
- Xóa `const JLPT_LEVELS = [...]` (line ~50-56)
- Xóa `const SRS_INTERVALS = [...]` (line ~67-73)
- Xóa tất cả helper functions đã được tách (getPosLabel, getPosColor, etc.)
- Xóa các component đã được tách (LoginScreen, HomeScreen, ReviewScreen, etc.)

### 3. Thay đổi các inline component thành imported ones:

```javascript
// Trước:
{view === 'HOME' && (
    <div className="...">
        {/* HomeScreen inline code */}
    </div>
)}

// Sau:
{view === 'HOME' && (
    <HomeScreen 
        allCards={allCards}
        reviewCards={reviewCards}
        profile={profile}
        dailyActivityLogs={dailyActivityLogs}
        onNavigate={setView}
        // ... other props
    />
)}
```

## 🔧 Chi tiết Props cho mỗi Component

### HomeScreen
```jsx
<HomeScreen 
    allCards={allCards}
    reviewCards={reviewCards}
    profile={profile}
    dailyActivityLogs={dailyActivityLogs}
    onStartReview={(mode) => {
        setReviewMode(mode);
        setView('REVIEW');
    }}
    onStartStudy={() => setView('STUDY')}
    onNavigate={setView}
/>
```

### ReviewScreen
```jsx
<ReviewScreen 
    cards={reviewCards}
    reviewMode={reviewMode}
    allCards={allCards}
    onUpdateCard={handleUpdateCard}
    onCompleteReview={(failedCards) => {
        setView('COMPLETE');
    }}
    vocabCollectionPath={vocabCollectionPath}
/>
```

### StudyScreen
```jsx
<StudyScreen 
    studySessionData={studySessionData}
    setStudySessionData={setStudySessionData}
    allCards={allCards}
    onUpdateCard={handleUpdateCard}
    onCompleteStudy={() => setView('COMPLETE')}
/>
```

### TestScreen  
```jsx
<TestScreen 
    allCards={allCards}
    onBack={() => setView('HOME')}
/>
```

### ListView
```jsx
<ListView 
    cards={allCards}
    onEditCard={(card) => {
        setEditingCard(card);
        setView('EDIT');
    }}
    onDeleteCard={handleDeleteCard}
    onAddCard={() => setView('ADD')}
    savedFilters={savedFilters}
    setSavedFilters={setSavedFilters}
/>
```

### LoginScreen
```jsx
<LoginScreen 
    onLogin={handleLogin}
    onRegister={handleRegister}
    onForgotPassword={handleForgotPassword}
    notification={notification}
/>
```

### AccountScreen
```jsx
<AccountScreen 
    profile={profile}
    updateProfile={handleUpdateProfile}
    onChangePassword={handleChangePassword}
    onLogout={handleLogout}
    onDeleteAccount={handleDeleteAccount}
    isDarkMode={isDarkMode}
    setIsDarkMode={setIsDarkMode}
/>
```

## 📊 Tiến độ: 100% (35/35 files)

| Category | Status | Count |
|----------|--------|-------|
| Config | ✅ | 3/3 |
| Utils | ✅ | 7/7 |
| Layout | ✅ | 2/2 |
| Cards | ✅ | 5/5 |
| UI | ✅ | 3/3 |
| Screens | ✅ | 14/14 |

## ⚡ Refactoring Complete - Next Steps

1. ~~**Update App.jsx imports** - Thêm import từ các module mới~~ ✅
2. ~~**Remove duplicates** - Xóa code đã được tách sang các module~~ ✅
3. **Test thoroughly** - Kiểm tra tất cả các chức năng
4. **Optimize bundle** - Sử dụng lazy loading nếu cần (React.lazy + Suspense)

## 🎉 Lợi ích của refactoring

1. **Code tổ chức tốt hơn** - Mỗi file có một mục đích rõ ràng
2. **Dễ bảo trì** - Tìm và sửa lỗi nhanh hơn
3. **Tái sử dụng** - Components có thể được reuse ở nhiều nơi
4. **Test dễ dàng** - Mỗi component có thể được test độc lập
5. **Lazy loading** - Có thể load các screens theo yêu cầu
6. **Bundle size** - Tree shaking hiệu quả hơn
