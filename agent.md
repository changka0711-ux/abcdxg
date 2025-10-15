# 專案：WhatsApp-Like Messenger with Pinned AI - 開發指南 (Agent.md)

本文檔為本專案的官方開發指南，旨在為所有參與的 Agent 提供一個清晰、統一的標準與藍圖，確保開發工作聚焦且高效。

## 1. 專案概覽

本專案旨在打造一個功能完整的即時通訊應用，類似 WhatsApp，並整合一個可置頂的 AI 助理聊天功能。核心目標是提供穩定、即時、安全且具備 AI 互動能力的跨平台通訊體驗。

## 2. 技術棧 (Technology Stack)

- **前端 (Mobile App):** React Native + Expo
- **後端 (Backend - Serverless):** Firebase / Google Cloud Platform (GCP)
- **使用者驗證:** Firebase Authentication
- **資料庫:** Cloud Firestore
- **檔案儲存:** Cloud Storage for Firebase
- **後端邏輯:** Cloud Functions for Firebase
- **推播通知:** Firebase Cloud Messaging (FCM)

## 3. 高層級系統架構

[ 用戶手機 App (React Native + Expo) ]
      |
      |--- (登入/註冊) ---> [ Firebase Auth ]
      |
      |<-- (即時讀寫訊息/好友列表) --> [ Cloud Firestore (DB) ]
      |
      |--- (上傳/下載圖片、語音) ---> [ Cloud Storage ]
      |
      |--- (呼叫 AI 對話) ---> [ Cloud Function (API) ] --- (安全呼叫) ---> [ 外部 LLM API ]
      |                                |
      |<------ (接收推播通知) ------ [ Firebase Cloud Messaging (FCM) ]
                                       ^
                                       |
[ Cloud Function (後端邏輯) ] <--- (觸發條件：新訊息寫入 Firestore) ---|

## 4. 核心開發原則

1.  **安全第一 (Security First):** 安全規則與功能開發同步進行。每開發一項新功能，都必須立即撰寫並測試對應的 Firestore/Storage 安全規則，確保資料存取受到嚴格控管。
2.  **效能導向的資料庫結構 (Performance-Oriented Schema):** 為提升讀取效率，對話列表將與完整訊息分開。主 `conversations` 集合僅儲存最新訊息摘要，而所有歷史訊息則存放在其下的 `messages` 子集合中。
3.  **結構化的前端狀態管理 (Structured State Management):** 本地開發將引入一個狀態管理函式庫 (如 Redux Toolkit 或 Zustand) 來統一管理複雜的應用程式狀態。

## 5. 優化後的開發藍圖 (里程碑)

開發工作將分為三個主要里程碑進行交付。

---

### **里程碑 1：核心通訊 MVP (Minimum Viable Product)**

*目標：完成最基礎的一對一即時文字通訊功能。*

#### **雲端任務 (Cloud Tasks):**
- [ ] 建立並初始化 Firebase 專案。
- [ ] 配置 Firebase Authentication (電子郵件/密碼)。
- [ ] 設計並部署 Firestore 基礎資料結構 (`users`, `conversations`)。
- [ ] 撰寫並部署 MVP 階段的 Firestore 安全規則 (僅限已驗證用戶讀寫自己的資料)。
- [ ] 設定 Cloud Storage 基礎儲存桶與安全規則。

#### **本地任務 (Local Tasks):**
- [ ] 使用 Expo 初始化 React Native 專案。
- [ ] 安裝核心 npm 套件 (`firebase`, `react-navigation` 等)。
- [ ] 在本地專案中配置 Firebase SDK。
- [ ] 實作註冊、登入、登出 UI 與邏輯。
- [ ] 建立 App 主導航 (登入頁 -> 主畫面)。
- [ ] 實作對話列表頁面 (讀取 `conversations` 集合)。
- [ ] 實作一對一聊天室介面。
- [ ] 連接 Firestore，實現即時文字訊息的發送、接收與顯示。

---

### **里程碑 2：AI 整合與多媒體**

*目標：加入 AI 聊天功能與圖片訊息支援。*

#### **雲端任務 (Cloud Tasks):**
- [ ] 建立並部署一個 HTTP-triggered Cloud Function，用於安全代理對外部 LLM API 的請求。
- [ ] 更新 Cloud Storage 安全規則，允許用戶上傳圖片到指定路徑。

#### **本地任務 (Local Tasks):**
- [ ] 在好友列表置頂 AI 聊天室。
- [ ] 實作呼叫雲端 Function 與 AI 對話的流程。
- [ ] 整合 `expo-image-picker`，允許用戶選擇圖片。
- [ ] 實作圖片上傳至 Cloud Storage 的邏輯。
- [ ] 在聊天室中顯示圖片訊息。

---

### **里程碑 3：社群功能與完善**

*目標：擴展至群組聊天，並完善使用者體驗。*

#### **雲端任務 (Cloud Tasks):**
- [ ] 設計並實現群組聊天的 Firestore 資料結構。
- [ ] 更新 Firestore 安全規則以支援群組聊天邏輯 (成員權限管理)。
- [ ] 建立並部署一個 Firestore-triggered Cloud Function，當有新訊息時觸發 FCM 推播通知。

#### **本地任務 (Local Tasks):**
- [ ] 實作好友列表、使用者搜尋、新增/刪除好友的 UI 與邏輯。
- [ ] 實作建立群組、邀請/踢除成員的 UI 介面。
- [ ] 實作群組聊天室的介面與訊息收發。
- [ ] 實作對話列表與聊天室內訊息的搜尋功能。
- [ ] 建立設定頁面 (個人資料、通知偏好等)。
- [ ] 建立前端的錯誤提示與日誌回報機制。
- [ ] 進行整體的 UI/UX 打磨與最終測試。
