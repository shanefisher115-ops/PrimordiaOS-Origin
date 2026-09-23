import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView } from "react-native";
import EventFeed from "./components/EventFeed";
import SnapshotViewer from "./components/SnapshotViewer";
import PipelineViewer from "./components/PipelineViewer";

export default function App() {
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);

        return () => ws.close();
    }, []);

    return (
        <View style={styles.container}>
            <Text style={styles.title}>PrimordiaOS Mobile</Text>
            <Text>Status: {connected ? "Connected" : "Disconnected"}</Text>

            <ScrollView style={{ width: "100%" }}>
                <EventFeed />
                <SnapshotViewer />
                <PipelineViewer />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 50,
        paddingHorizontal: 20,
        backgroundColor: "#f5f5f5"
    },
    title: {
        fontSize: 28,
        fontWeight: "bold",
        marginBottom: 10
    }
});
