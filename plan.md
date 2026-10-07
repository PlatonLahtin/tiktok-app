# TikTok Clone - React Native Expo Implementation Plan

An immersive, short-form video sharing mobile application built using React Native, Expo, and Tailwind CSS.

---

## 🛠️ Technology Stack & Dependencies

*   **Framework:** React Native (Expo SDK 51/52+)
*   **Navigation:** Expo Router (File-based routing, tab navigation)
*   **Styling:** NativeWind (Tailwind CSS for React Native)
*   **Animations:** React Native Reanimated & React Native Gesture Handler (for smooth swiping, double-tap animations)
*   **Video Playback:** `expo-av` (or `expo-video` if using newer SDK versions) for high-performance video rendering
*   **Camera Integration:** `expo-camera` & `expo-image-picker` for recording and media selection
*   **State Management:** Zustand (lightweight, fast global state)
*   **Icons:** `lucide-react-native` or `@expo/vector-icons`

---

## 📱 Key Features & Modules

### 1. Home Screen (Vertical Video Feed)
*   **Full-Screen Video Player:** Infinite vertical swiping using `FlatList` with `pagingEnabled` or `FlashList` for high performance.
*   **Playback Management:** Smart video auto-play/pause when items enter or exit the active viewport.
*   **Overlay Actions:** Profile avatar (with follow button), heart button (with tap counts), comments bubble (triggering bottom sheet), share button, and rotating audio disk.
*   **Double-Tap to Like:** Custom spring-animation heart overlay on the video on double-tap (`react-native-gesture-handler` + `reanimated`).
*   **Progress Bar:** Direct video progress tracking line at the bottom.

### 2. Discover / Search Screen
*   **Search Bar:** Search for videos, users, and hashtags.
*   **Hashtag Banners:** Horizontal sliders showing trending challenge categories.
*   **Grid View:** Column-based thumbnail layout of popular videos with view count overlays.

### 3. Create Video / Camera Screen
*   **Custom Camera View:** Switch between front/back camera, toggle flash, and select timer.
*   **Recording Controls:** Tap-and-hold or press-to-start recording with circular progress indicator.
*   **Sound Selector:** Dynamic bottom sheet to select audio tracks overlaying the video.
*   **Gallery Import:** Pick existing clips from the system gallery.

### 4. Inbox & Messaging Screen
*   **Activity Feed:** System notifications, likes, comments, and mentions.
*   **Direct Messages (DM):** Real-time-style chat interface for messaging friends.

### 5. Profile Screen
*   **User Info:** Avatar, username, bio, and counts for Followers, Following, and Likes.
*   **Tabbed Grid Layout:**
    *   *Grid 1:* Public uploaded videos (video thumbnails).
    *   *Grid 2:* Private/Draft videos.
    *   *Grid 3:* Liked videos.
*   **Settings / Customization:** Edit profile panel (name, bio, profile photo).

---

## 🗺️ Step-by-Step Implementation Roadmap

### Phase 1: Environment & Project Setup
1. Initialize the Expo app with TypeScript and Expo Router.
2. Configure Tailwind CSS / NativeWind.
3. Set up the basic file-based folder structure under `src/`.
4. Define theme colors and typography.

### Phase 2: Navigation & Base Layouts
1. Create the bottom tab navigator (`Home`, `Discover`, `Create`, `Inbox`, `Profile`).
2. Implement global custom styling to support dark-themed video feeds and light-themed profiles.

### Phase 3: Infinite Video Feed (Home Screen)
1. Build the mockup feed data structure.
2. Implement the full-screen video player using `expo-av`.
3. Add viewability configuration (`onViewableItemsChanged`) to play only the active video.
4. Construct overlays: Action buttons, caption details, rotating music disc, and comment bottom sheets.
5. Code the double-tap heart gesture animation.

### Phase 4: Discover & Profile Pages
1. Build the Discover UI with dynamic search fields and custom category lists.
2. Build the Profile layout with tab switching and edit features.

### Phase 5: Camera & Media Creation
1. Implement camera permissions and customized camera viewport.
2. Integrate audio library selections.
3. Design dynamic progress rings for clip recording.

---

## 🧪 Verification Plan

*   **Local UI Validation:** Run Expo web/simulator to check layout responsiveness across different device sizes.
*   **Gesture Verification:** Test vertical snap-swiping and double-tap actions to ensure no frame drops.
*   **Media Optimization:** Check memory management when caching/recycling video items to prevent lag.
