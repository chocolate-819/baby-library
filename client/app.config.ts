import { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.COZE_PROJECT_NAME || process.env.EXPO_PUBLIC_COZE_PROJECT_NAME || '幼儿阅读学习';
const projectId = process.env.COZE_PROJECT_ID || process.env.EXPO_PUBLIC_COZE_PROJECT_ID;
const slugAppName = projectId ? `app${projectId}` : 'kidreader';

export default ({ config }: ConfigContext): ExpoConfig => {
  return {
    ...config,
    "name": appName,
    "slug": slugAppName,
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "kidreader",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.kidreader.app"
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/images/adaptive-icon.png",
        "backgroundColor": "#7C5CFC"
      },
      "package": `com.kidreader.app`
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/images/favicon.png",
      "name": "幼儿阅读学习",
      "shortName": "阅读学习",
      "description": "专为幼儿设计的阅读学习应用，支持PDF绘本、音频、视频",
      "themeColor": "#7C5CFC",
      "backgroundColor": "#F0EDFA",
      "orientation": "portrait",
      "preferRelatedApplications": false,
    },
    "plugins": [
      process.env.EXPO_PUBLIC_BACKEND_BASE_URL ? [
        "expo-router",
        {
          "origin": process.env.EXPO_PUBLIC_BACKEND_BASE_URL
        }
      ] : 'expo-router',
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#F0EDFA"
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": `允许幼儿阅读学习App访问您的相册，以便您上传或保存图片。`,
          "cameraPermission": `允许幼儿阅读学习App使用您的相机，以便您直接拍摄照片上传。`,
          "microphonePermission": `允许幼儿阅读学习App访问您的麦克风，以便您拍摄带有声音的视频。`
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": projectId
      }
    }
  }
}
