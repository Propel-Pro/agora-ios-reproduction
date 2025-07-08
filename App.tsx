import {StatusBar} from 'expo-status-bar';
import React, {useEffect, useRef, useState} from 'react';
import {
  AudioScenarioType,
  ChannelProfileType,
  ClientRoleType,
  IRtcEngine,
  IRtcEngineEventHandler,
} from 'react-native-agora';
import {createAgoraRtcEngine, RtcSurfaceView, RtcConnection, ChannelMediaOptions} from 'react-native-agora';
import {Dimensions, PermissionsAndroid, Platform, StyleSheet, Text, TouchableOpacity, View} from 'react-native';

const {width} = Dimensions.get('window');

// NOTE: Generate a pair of tokens with UID=0/1 and channel='test' per the instructions at
// https://www.agora.io/en/blog/how-to-build-a-token-server-for-agora-applications-using-nodejs/
const AGORA_APP_ID = 'APP_ID';
const CHANNEL = 'test';
const USER_1_TOKEN = 'TOKEN_1';
const USER_0_TOKEN = 'TOKEN_2';

const ASPECT_RATIO = 440 / 285;
const VIDEO_WIDTH = width;
const VIDEO_HEIGHT = Math.round(VIDEO_WIDTH / ASPECT_RATIO);

const CHANNEL_OPTIONS: ChannelMediaOptions = {
  publishMicrophoneTrack: true,
  publishCameraTrack: true,
  autoSubscribeAudio: true,
  autoSubscribeVideo: true,
  enableAudioRecordingOrPlayout: true,
  clientRoleType: ClientRoleType.ClientRoleBroadcaster,
};

export default function App() {
  const agoraEngineRef = useRef<IRtcEngine | null>(null);
  const [isJoined, setIsJoined] = useState(false);
  const [localUid, setLocalUid] = useState(0);
  const eventHandler = useRef<IRtcEngineEventHandler | null>(null);

  const setupVideoSDKEngine = async () => {
    try {
      if (Platform.OS === 'android') {
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          PermissionsAndroid.PERMISSIONS.CAMERA,
        ]);
      }

      agoraEngineRef.current = createAgoraRtcEngine();
      agoraEngineRef.current.initialize({
        appId: AGORA_APP_ID,
        channelProfile: ChannelProfileType.ChannelProfileCommunication,
        audioScenario: AudioScenarioType.AudioScenarioMeeting,
      });
    } catch (e) {
      console.error('Error initializing Agora', e);
    }
  };

  const join = async (uid: number) => {
    setLocalUid(uid);

    // If we were already joined to something, we'll get a -17 rejection if we try to join again.
    // This tolerates us not already being in a channel, so we call it either way to be safe.
    agoraEngineRef.current?.leaveChannel();

    const token = uid === 0 ? USER_0_TOKEN : USER_1_TOKEN;
    const res = agoraEngineRef.current?.joinChannel(token, CHANNEL, uid, CHANNEL_OPTIONS);
    if (res === 0) {
      // NOTE: We don't get a join event when joining on iOS, so we trigger these as if we did
      setIsJoined(true);
      setupLocalVideo();
    }
  };

  const cleanupAgoraEngine = () => {
    return () => {
      agoraEngineRef.current?.unregisterEventHandler(eventHandler.current!);
      agoraEngineRef.current?.release();
    };
  };

  const setupEventHandler = () => {
    // NOTE: These events are never fired on iOS
    eventHandler.current = {
      onJoinChannelSuccess: () => {
        console.log('Agora join OK');
        setupLocalVideo();
        setIsJoined(true);
      },
      onUserJoined: (_connection: RtcConnection, uid: number) => {
        console.log('Agora user joined', uid);
      },
      onUserOffline: (_connection: RtcConnection, uid: number) => {
        console.log('Agora user offline', uid);
      },
      onConnectionStateChanged: (connection, state, reason) => {
        console.log('Agora connection state changed:', state, reason, connection);
      },
      onError: (err, msg) => {
        console.log('Agora error:', err, msg);
      },
    };

    agoraEngineRef.current?.registerEventHandler(eventHandler.current);
  };

  const setupLocalVideo = () => {
    agoraEngineRef.current?.enableVideo();
    agoraEngineRef.current?.startPreview();
  };

  useEffect(() => {
    const init = async () => {
      await setupVideoSDKEngine();
      setupEventHandler();
    };
    init();

    return () => {
      cleanupAgoraEngine();
    };
  }, []);

  if (!isJoined) {
    return (
      <View style={styles.container}>
        <StatusBar style="auto" />
        <View style={styles.buttonContainer}>
          <TouchableOpacity onPress={() => join(0)} style={styles.joinButton}>
            <Text>Join as User 0 (Guest)</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => join(1)} style={styles.joinButton}>
            <Text>Join as User 1 (Host)</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.videos}>
        <RtcSurfaceView canvas={{uid: localUid === 0 ? 1 : 0}} style={{width: VIDEO_WIDTH, height: VIDEO_HEIGHT}} />
        <RtcSurfaceView canvas={{uid: localUid}} style={{width: VIDEO_WIDTH, height: VIDEO_HEIGHT}} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },

  joinButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 15,
    textAlign: 'center',
    paddingHorizontal: 20,
    backgroundColor: 'lightgray',
  },

  buttonContainer: {
    flex: 1,
    width: '100%',
    padding: 60,
    borderWidth: 2,
    borderColor: 'red',
    gap: 20,
  },

  videos: {
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: '#000030',
  },
});
