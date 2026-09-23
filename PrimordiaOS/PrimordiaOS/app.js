const { useState, useEffect } = React;

function Dashboard() {
    const [data, setData] = useState({
        prediction: null,
        violations: [],
        corrections: [],
        drift: [],
        rules: [],
        hash: null
    });

    async function fetchJSON(url) {
        const res = await fetch(url);
        return res.json();
    }

    async function refresh() {
        const prediction = await fetchJSON("/api/prediction");
        const violations = await fetchJSON("/api/violations");
        const corrections = await fetchJSON("/api/corrections");
        const drift = await fetchJSON("/api/drift");
        const rules = await fetchJSON("/api/rules");
        const hash = await fetchJSON("/api/hash");

        setData({
            prediction,
            violations,
            corrections,
            drift,
            rules,
            hash
        });
    }

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 3000);
        return () => clearInterval(interval);
    }, []);

    const { prediction, violations, corrections, drift, rules, hash } = data;

    if (!prediction) {
        return <div className="dashboard"><h1>Loading...</h1></div>;
    }

    return (
        <div className="dashboard">
            <h1>PrimordiaOS World Stability Dashboard 2.0</h1>

            <div className="card">
                <h2>Instability Score</h2>
                <p>{prediction.instability_score}/100</p>
            </div>

            <div className="card">
                <h2>High-Risk Actors</h2>
                <pre>{JSON.stringify(prediction.high_risk_actors, null, 2)}</pre>
            </div>

            <div className="card">
                <h2>High-Risk Rules</h2>
                <pre>{JSON.stringify(prediction.high_risk_rules, null, 2)}</pre>
            </div>

            <div className="card">
                <h2>Unstable Regions</h2>
                <pre>{JSON.stringify(prediction.unstable_regions, null, 2)}</pre>
            </div>

            <div className="card">
                <h2>Recent Drift Direction</h2>
                <pre>{JSON.stringify(prediction.drift_direction, null, 2)}</pre>
            </div>

            <div className="card">
                <h2>Worldstate Hash</h2>
                <p>{hash.hash}</p>
            </div>

            <div className="card">
                <h2>Violation History</h2>
                <pre>{JSON.stringify(violations.slice(-10), null, 2)}</pre>
            </div>

            <div className="card">
                <h2>Correction History</h2>
                <pre>{JSON.stringify(corrections.slice(-10), null, 2)}</pre>
            </div>

            <div className="card">
                <h2>Drift History</h2>
                <pre>{JSON.stringify(drift.slice(-10), null, 2)}</pre>
            </div>

            <div className="card">
                <h2>Rule Evolution</h2>
                <pre>{JSON.stringify(rules.slice(-10), null, 2)}</pre>
            </div>
        </div>
    );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Dashboard />);
