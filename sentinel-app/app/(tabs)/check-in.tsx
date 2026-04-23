import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Image, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import { getDistance } from 'geolib';

export default function CheckInScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const cameraRef = useRef<CameraView>(null);

  // Mock Duty Location (e.g., Margao Police Station Naka)
  const ASSIGNED_NAKA = { latitude: 15.2832, longitude: 73.9631 }; 
  const ALLOWED_RADIUS_METERS = 50;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission to access location was denied');
        return;
      }
      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc);
    })();
  }, []);

  if (!permission) return <View />; // Loading
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="grant permission" />
      </View>
    );
  }

  const handleCheckIn = async () => {
    if (!cameraRef.current || !location) return;

    // 1. Check Geofence locally first for quick UI feedback
    const distance = getDistance(
      { latitude: location.coords.latitude, longitude: location.coords.longitude },
      ASSIGNED_NAKA
    );

    if (distance > ALLOWED_RADIUS_METERS) {
      Alert.alert("Geofence Error", `You are ${distance}m away. You must be within ${ALLOWED_RADIUS_METERS}m of the Naka.`);
      return;
    }

    // 2. Take the Selfie
    const photo = await cameraRef.current.takePictureAsync({ base64: true });
    setPhotoUri(photo.uri);

    // 3. Prepare Payload for Next.js Backend
    const payload = {
      timestamp: new Date().toISOString(),
      location: {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      },
      image: photo.base64, // Send base64 to backend, or upload to S3/Supabase storage and send URL
    };

    console.log("Sending to backend...", payload);
    Alert.alert("Success", "Duty Verified and Logged.");
  };

  return (
    <View style={styles.container}>
      {!photoUri ? (
        <>
          <CameraView style={styles.camera} facing="front" ref={cameraRef} />
          <View style={styles.buttonContainer}>
            <Button title="Verify Location & Snap Selfie" onPress={handleCheckIn} />
          </View>
        </>
      ) : (
        <>
          <Image source={{ uri: photoUri }} style={styles.camera} />
          <Button title="Retake" onPress={() => setPhotoUri(null)} />
        </>
      )}
      {location && (
        <Text style={styles.text}>
          Lat: {location.coords.latitude.toFixed(4)}, Lng: {location.coords.longitude.toFixed(4)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  camera: { flex: 0.8, width: '100%' },
  buttonContainer: { padding: 20 },
  text: { textAlign: 'center', marginTop: 10 }
});