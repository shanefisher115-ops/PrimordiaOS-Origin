import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";

interface EventMessage {
    type: string;
    topic: string;
    payload: any;
    ts: number;
}

export default function EventFeed() {
    const [events, setEvents] = useState<EventMessage[]>([]);

    useEffect(() => {
        const ws = new WebSocket("ws://localhost:9090");

        ws.onmessage = (msg) => {
            const data = JSON.parse(msg.data);

            if (data.type === "event") {
                setEvents((prev) => [data, ...prev].slice(0, 30));
            }
        };

        return () => ws.close();
    }, []);

    return (
        <View style={styles.box}>
            <Text style={styles.header}>Event Feed</Text>
            {events.map((e, i) => (
                <View key={i} style={styles.item}>
                    <Text style={styles.topic}>{e.topic}</Text>
                    <Text style={styles.payload}>{JSON.stringify(e.payload)}</Text>
                    <Text style={styles.time}>{new Date(e.ts).toLocaleTimeString()}</Text>
                </View>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    box: {
        backgroundColor: "#fff",
        padding: 10,
        marginVertical: 10,
        borderRadius: 8
    },
    header: {
        fontSize: 20,
        fontWeight: "bold",
        marginBottom: 10
    },
    item: {
        marginBottom: 10
    },
    topic: {
        fontWeight: "bold"
    },
    payload: {
        fontSize: 12
    },
    time: {
        fontSize: 10,
        color: "#666"
    }
});
