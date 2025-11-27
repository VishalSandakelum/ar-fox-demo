(async function () {
  const isArSessionSupported =
    navigator.xr &&
    navigator.xr.isSessionSupported &&
    (await navigator.xr.isSessionSupported("immersive-ar"));
  if (isArSessionSupported) {
    document
      .getElementById("enter-ar")
      .addEventListener("click", window.app.activateXR);
  } else {
    onNoXRDevice();
  }
})();

const TARGET_Y_RAISE = 0.2;
const FLY_UP_SPEED = 0.5;

class App {
  activateXR = async () => {
    try {
      this.xrSession = await navigator.xr.requestSession("immersive-ar", {
        requiredFeatures: ["hit-test", "dom-overlay"],
        domOverlay: { root: document.body },
      });

      this.createXRCanvas();

      await this.onSessionStarted();
    } catch (e) {
      onNoXRDevice();
    }
  };

  createXRCanvas() {
    this.canvas = document.createElement("canvas");
    document.body.appendChild(this.canvas);
    this.gl = this.canvas.getContext("webgl", { xrCompatible: true });

    this.xrSession.updateRenderState({
      baseLayer: new XRWebGLLayer(this.xrSession, this.gl),
    });
  }

  onSessionStarted = async () => {
    document.body.classList.add("ar");

    this.setupThreeJs();

    this.localReferenceSpace = await this.xrSession.requestReferenceSpace(
      "local"
    );

    this.viewerSpace = await this.xrSession.requestReferenceSpace("viewer");
    this.hitTestSource = await this.xrSession.requestHitTestSource({
      space: this.viewerSpace,
    });

    this.xrSession.requestAnimationFrame(this.onXRFrame);

    this.xrSession.addEventListener("select", this.onSelect);
  };

  onSelect = () => {
    if (window.sunflower) {
      const clone = window.sunflower.clone();
      clone.position.copy(this.reticle.position);
      clone.isAnimating = true;
      clone.targetY = clone.position.y + TARGET_Y_RAISE;

      // Clone the animation mixer
      if (window.sunflower.mixer) {
        const mixer = new THREE.AnimationMixer(clone.children[0]);
        const action = mixer.clipAction(window.sunflower.animations[0]);
        action.play();
        clone.mixer = mixer;
      }

      this.scene.add(clone);
      this.placedObjects.push(clone);
    }
  };

  onXRFrame = (time, frame) => {
    this.xrSession.requestAnimationFrame(this.onXRFrame);

    const framebuffer = this.xrSession.renderState.baseLayer.framebuffer;
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, framebuffer);
    this.renderer.setFramebuffer(framebuffer);

    const pose = frame.getViewerPose(this.localReferenceSpace);
    if (pose) {
      const view = pose.views[0];

      const viewport = this.xrSession.renderState.baseLayer.getViewport(view);
      this.renderer.setSize(viewport.width, viewport.height);

      this.camera.matrix.fromArray(view.transform.matrix);
      this.camera.projectionMatrix.fromArray(view.projectionMatrix);
      this.camera.updateMatrixWorld(true);

      const hitTestResults = frame.getHitTestResults(this.hitTestSource);

      if (!this.stabilized && hitTestResults.length > 0) {
        this.stabilized = true;
        document.body.classList.add("stabilized");
      }
      if (hitTestResults.length > 0) {
        const hitPose = hitTestResults[0].getPose(this.localReferenceSpace);

        this.reticle.visible = true;
        this.reticle.position.set(
          hitPose.transform.position.x,
          hitPose.transform.position.y,
          hitPose.transform.position.z
        );
        this.reticle.updateMatrixWorld(true);
      }

      const delta = this.clock.getDelta();
      this.placedObjects.forEach((object) => {
        if (object.isAnimating) {
          object.position.y += FLY_UP_SPEED * delta;
          if (object.position.y >= object.targetY) {
            object.position.y = object.targetY;
            object.isAnimating = false;
          }
        }
        if (object.mixer) {
          object.mixer.update(delta);
        }
      });

      this.renderer.render(this.scene, this.camera);
    }
  };

  setupThreeJs() {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      preserveDrawingBuffer: true,
      canvas: this.canvas,
      context: this.gl,
    });
    this.renderer.autoClear = false;

    this.scene = DemoUtils.createLitScene();
    this.reticle = new Reticle();
    this.scene.add(this.reticle);
    this.placedObjects = [];
    this.clock = new THREE.Clock();

    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
  }
}

window.app = new App();