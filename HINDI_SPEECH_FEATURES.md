# Hindi Language & Text-to-Speech Implementation

## Overview
This document describes the Hindi language support and text-to-speech (TTS) features implemented for better accessibility and inclusivity for Hindi-speaking users, particularly those with low literacy levels.

## Features Implemented

### 1. **Language Toggle with Audio Playback**
- **Location**: Header (LanguageToggle component)
- **Features**:
  - Toggle between English (EN) and Hindi (HI)
  - **🔊 Audio Button**: Click to hear the current language name spoken aloud
  - Entire page content switches language when toggled
  - When switching languages, any active speech is automatically stopped

### 2. **Text-to-Speech Service**
- **File**: `src/services/SpeechService.ts`
- **Capabilities**:
  - Speaks text in the selected language (English or Hindi)
  - Uses Web Speech API for native browser support
  - Adjustable speech rate (slower for clarity)
  - Automatic language mapping:
    - English → `en-US`
    - Hindi → `hi-IN`
  - Stop/cancel speech functionality
  - Browser compatibility detection

### 3. **Metric Cards with Audio**
- **Location**: Each metric card (Workers Helped, Jobs Created, Total Wages)
- **Features**:
  - 🔊 **Read Aloud Button** on each metric card
  - Speaks the metric value and description in the current language
  - Example: "Workers helped: 5,000" in Hindi

### 4. **Custom useSpeech Hook**
- **File**: `src/hooks/useSpeech.ts`
- **Purpose**: Reusable hook for any component to add speech functionality
- **Usage Example**:
  ```tsx
  const { speak, stop, isSpeaking, isSupported } = useSpeech();
  
  // Speak text
  await speak("Your text here");
  
  // Stop speaking
  stop();
  ```

### 5. **ReadAloudButton Component**
- **File**: `src/components/ReadAloudButton.tsx`
- **Features**:
  - Reusable button component for any text
  - Animated pulsing effect while speaking
  - Automatic language detection
  - Browser support detection
  - Customizable size and label

## Translation Files

### English Translations
**File**: `src/locales/en.json`
- App title and descriptions
- District selection prompts
- Metric explanations
- Error messages
- Geolocation and help text

### Hindi Translations
**File**: `src/locales/hi.json`
- Complete Hindi translations for all UI text
- Metric descriptions in Hindi
- Error messages in Hindi
- Accessibility prompts in Hindi

## How to Use

### For End Users

1. **Switch Language**:
   - Click the "EN" or "HI" button in the header
   - The entire page will change to English or Hindi immediately

2. **Hear Language Pronunciation**:
   - Click the 🔊 (volume) icon next to language buttons
   - The language name will be spoken aloud
   - Click the ⏹️ icon to stop playback

3. **Listen to Metric Values**:
   - On each metric card (Workers Helped, Jobs Created, Wages)
   - Click the 🔊 icon to hear the metric value read aloud
   - Content is spoken in the current language

### For Developers

1. **Add Speech to Custom Component**:
   ```tsx
   import { useSpeech } from '../hooks/useSpeech';
   
   export const MyComponent = () => {
     const { speak, isSpeaking } = useSpeech();
     
     return (
       <button onClick={() => speak("Hello in current language!")}>
         {isSpeaking ? 'Stop' : 'Speak'}
       </button>
     );
   };
   ```

2. **Use ReadAloudButton**:
   ```tsx
   import ReadAloudButton from '../components/ReadAloudButton';
   
   export const MyComponent = () => {
     return (
       <div>
         <span>Important information</span>
         <ReadAloudButton text="Important information" size="small" />
       </div>
     );
   };
   ```

3. **Speak Text in App**:
   - The `playAudio()` function in `App.tsx` uses the current language
   - It automatically respects the selected language (EN or HI)

## Accessibility Benefits

✅ **For Low-Literacy Users**:
- Audio pronunciation helps with word recognition
- Visual language toggle with emoji indicators
- Large, accessible buttons throughout

✅ **For Non-Native Speakers**:
- Hear correct Hindi pronunciation
- Understand complex terms through audio

✅ **For Users with Visual Impairments**:
- All important content can be spoken
- Screen reader compatible

## Browser Support

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ✅ Mobile browsers (Chrome, Safari iOS)

**Note**: Speech recognition quality varies by browser and region. Works best with:
- Chrome/Chromium (best support)
- Firefox (good support)
- Safari (good support, iOS 14+)

## Technical Details

### Language Detection
- Current language is stored in `i18n.language`
- Automatic language mapping to speech API codes
- Falls back to English if language not supported

### Speech Rate
- Set to 0.9 (slightly slower than normal)
- Improves clarity for non-native speakers
- Can be adjusted in `SpeechService.ts`

### Error Handling
- Silent failure if Speech API not supported
- Console logging for debugging
- Graceful degradation in unsupported browsers

## Configuration

### Change Speech Rate
Edit `src/services/SpeechService.ts`:
```typescript
utterance.rate = 0.9; // Change this value (0.5-2.0)
```

### Add New Language
1. Add translation file: `src/locales/[lang].json`
2. Update `src/i18n.ts`
3. Update language map in `src/services/SpeechService.ts`:
   ```typescript
   const languageMap = {
     en: 'en-US',
     hi: 'hi-IN',
     // Add new language here
     kn: 'kn-IN', // Kannada example
   };
   ```

## Testing

1. **Test Language Toggle**:
   - Click EN/HI buttons
   - Verify page content changes
   - Verify speech service uses correct language

2. **Test Audio Playback**:
   - Click 🔊 buttons in language selector
   - Verify language name is spoken
   - Test stopping mid-speech

3. **Test Metrics**:
   - Open a district
   - Click 🔊 on each metric card
   - Verify values are read in current language

## Future Enhancements

1. Add more Indian languages (Kannada, Tamil, Telugu, etc.)
2. Speed/pitch controls for users
3. Offline speech synthesis support
4. Save user language preference
5. Voice-controlled navigation
6. Audio cues for page sections

## Notes for Users

- **Internet Required**: Text-to-speech requires browser support
- **Audio Privacy**: Audio is processed by browser, not stored anywhere
- **Battery Usage**: Speech synthesis uses more battery on mobile devices
- **Network**: Doesn't require internet after initial page load