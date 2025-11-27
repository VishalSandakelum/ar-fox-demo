window.gltfLoader = new THREE.GLTFLoader();

class Reticle extends THREE.Object3D {
  constructor() {
    super();

    this.loader = new THREE.GLTFLoader();
    this.loader.load(
      "https://immersive-web.github.io/webxr-samples/media/gltf/reticle/reticle.gltf",
      (gltf) => {
        this.add(gltf.scene);
      }
    );

    this.visible = false;
  }
}

window.gltfLoader.load(
  "assets/dragon_flying.glb",
  (gltf) => {
    const model = gltf.scene;
    const animations = gltf.animations;

    model.scale.set(0.5, 0.5, 0.5);

    // Use a wrapper group to normalize the model's position
    const wrapper = new THREE.Group();

    // Correct the model's orientation first
    model.rotation.x = Math.PI / 2;

    // Then, calculate the bounding box
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());

    // Reposition the model inside the wrapper so its base is at the origin
   // model.position.set(-center.x, -box.min.y, -center.z);

    wrapper.add(model);

    // Apply rotation to the wrapper
    wrapper.rotation.set(0, Math.PI / 4, 0);

    // Set up the animation mixer
    if (animations && animations.length) {
      const mixer = new THREE.AnimationMixer(model);
      const action = mixer.clipAction(animations[0]);
      action.play();
      wrapper.mixer = mixer; // Attach mixer to the wrapper
      wrapper.animations = animations; // Store animations
    }

    window.sunflower = wrapper; // keep this name!
  },
  undefined,
  (error) => {
    console.error("An error occurred while loading the model.", error);
  }
);

window.DemoUtils = {
  /**
   * Creates a THREE.Scene containing lights that case shadows,
   * and a mesh that will receive shadows.
   *
   * @return {THREE.Scene}
   */
  createLitScene() {
    const scene = new THREE.Scene();

    const light = new THREE.AmbientLight(0xffffff, 1);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3);
    directionalLight.position.set(10, 15, 10);

    directionalLight.castShadow = true;

    const planeGeometry = new THREE.PlaneGeometry(2000, 2000);
    planeGeometry.rotateX(-Math.PI / 2);

    const shadowMesh = new THREE.Mesh(
      planeGeometry,
      new THREE.ShadowMaterial({
        color: 0x111111,
        opacity: 0.2,
      })
    );

    shadowMesh.name = "shadowMesh";
    shadowMesh.receiveShadow = true;
    shadowMesh.position.y = 10000;

    scene.add(shadowMesh);
    scene.add(light);
    scene.add(directionalLight);

    return scene;
  },

  /**
   * Creates a THREE.Scene containing cubes all over the scene.
   *
   * @return {THREE.Scene}
   */
  createCubeScene() {
    const scene = new THREE.Scene();

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0xff0000 }),
      new THREE.MeshBasicMaterial({ color: 0x0000ff }),
      new THREE.MeshBasicMaterial({ color: 0x00ff00 }),
      new THREE.MeshBasicMaterial({ color: 0xff00ff }),
      new THREE.MeshBasicMaterial({ color: 0x00ffff }),
      new THREE.MeshBasicMaterial({ color: 0xffff00 }),
    ];

    const ROW_COUNT = 4;
    const SPREAD = 1;
    const HALF = ROW_COUNT / 2;
    for (let i = 0; i < ROW_COUNT; i++) {
      for (let j = 0; j < ROW_COUNT; j++) {
        for (let k = 0; k < ROW_COUNT; k++) {
          const box = new THREE.Mesh(
            new THREE.BoxBufferGeometry(0.2, 0.2, 0.2),
            materials
          );
          box.position.set(i - HALF, j - HALF, k - HALF);
          box.position.multiplyScalar(SPREAD);
          scene.add(box);
        }
      }
    }

    return scene;
  },
};

function onNoXRDevice() {
  document.body.classList.add("unsupported");
}
