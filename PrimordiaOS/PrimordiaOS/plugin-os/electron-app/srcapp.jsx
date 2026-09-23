import { createSignal, onMount } from 'solid-js';

function App() {
  const [state, setState] = createSignal({ objects: {} });

  onMount(() => {
    Primordial.subscribeToPhysics();

    Primordial.onPhysicsState((s) => setState(s));

    Primordial.onPriorityUpdate(({ fileId, priority }) => {
      if (priority === 'high') {
        Primordial.sendForce(fileId, 0, -0.02);
      }
    });
  });

  const cad = () => state().objects.CAD_FILE_A || { x: 0, y: 0 };

  return (
    <div style="display:flex;flex-direction:column;align-items:center;margin-top:40px;">
      <div
        id="viewport"
        style="width:400px;height:400px;background:#111;position:relative;"
      >
        <div
          id="obj-CAD_FILE_A"
          style={{
            width: '20px',
            height: '20px',
            'border-radius': '50%',
            background: '#ffd86b',
            position: 'absolute',
            transform: `translate(${cad().x * 200}px, ${cad().y * 200}px)`
          }}
        />
      </div>

      <pre style="margin-top:20px;color:#fff;">
        {JSON.stringify(state(), null, 2)}
      </pre>
    </div>
  );
}

export default App;
