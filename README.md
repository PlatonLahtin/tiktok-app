# TikTok Clone (React Native + Expo Web)

A stunning, high-fidelity TikTok frontend clone built completely from scratch using **Expo (v56)**, **React Native**, and **NativeWind (Tailwind CSS)**. This project focuses on delivering a deeply immersive UI/UX that mirrors the real application, packed with smooth animations and complex interactions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Expo](https://img.shields.io/badge/Expo-000020?style=flat&logo=expo&logoColor=white)

## ✨ Features

- **Endless Vertical Feed:** A fully functional, infinitely scrolling `FlatList` with precise snapping physics and autoplaying videos.
- **Global Authentication Wall:** A mock `Zustand` global state that locks interaction (likes, comments, following) behind a beautiful Auth Modal.
- **Video Studio (Camera):** A mock video creation workflow with draggable text stickers, simulated filters, and a trending sound selection modal.
- **Immersive Livestreams:** A mocked Live Broadcasting environment featuring an infinitely looping background video, auto-scrolling chat, and Reanimated flying gift/heart animations.
- **Advanced Search Engine:** A Discover tab equipped with an interactive tabbed layout (Top, Users, Videos).
- **Direct Messaging:** An inbox and messaging UI for chatting.
- **Deep Linking Navigation:** Built with Expo Router for robust file-based routing.

## 🛠️ Tech Stack

- **Framework:** [Expo](https://expo.dev/) (SDK 56) & [React Native](https://reactnative.dev/)
- **Navigation:** [Expo Router](https://docs.expo.dev/router/introduction/) (v3)
- **Styling:** [NativeWind](https://www.nativewind.dev/) (Tailwind CSS for React Native)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand)
- **Media Playback:** `expo-video`
- **Animations:** `react-native-reanimated` & `expo-haptics`
- **Icons:** `lucide-react-native`

## 🚀 Getting Started

This application is highly optimized for the Web browser but is perfectly primed for native iOS/Android compilation.

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Installation

1. **Clone the repository:**
   ```bash
   git clone <your-github-url>
   cd tiktok-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

4. **Run on Web:**
   Press `w` in the terminal to open the app in your browser. 
   *(Note: Because this is a mobile clone, be sure to resize your browser window to a tall, narrow mobile aspect ratio, or use Chrome DevTools' Device Toolbar to simulate a phone!)*

## 📂 Project Structure

- `/src/app` - Expo Router file-based navigation (Tabs, Modals, Dynamic Routes).
- `/src/components` - Reusable UI components (VideoPost, AuthModal, LiveStreamModal).
- `/src/store` - Global state management using Zustand (`useVideoStore.ts`).
- `/assets` - Local video and image assets.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

## 📝 License
This project is open source and available under the [MIT License](LICENSE).
