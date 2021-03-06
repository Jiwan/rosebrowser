'use strict';

/**
 * @constructor
 */
function ParticleTestState() {
  State.call(this);

  this.DM = new DataManager();
  this.world = null;
}
ParticleTestState.prototype = new State();

ParticleTestState.prototype.prepare = function(callback) {
  callback();
};

ParticleTestState.prototype.spawnBonfire = function() {
  var bonfire = new NpcPawn();
  bonfire.setModel(801);
  bonfire.rootObj.position.set(5200 + (Math.random() * 20) - 10, 5280 + (Math.random() * 20) - 10, -5);
  scene.add(bonfire.rootObj);
};

ParticleTestState.prototype.fuckingMeteors = function() {
  var rootObj = new THREE.Object3D();
  var effect;
  effect = new EffectManager.loadEffect('3Ddata\\EFFECT\\_RUNASTON_01.EFT', function() {
    effect.play();
  });

  rootObj.add(effect.rootObj);
  rootObj.add(effect.rootObj2);
  rootObj.position.set(5200 + (Math.random() * 20) - 10, 5280 + (Math.random() * 20) - 10, -5);
  scene.add(rootObj);
};

ParticleTestState.prototype.enter = function() {
  var self = this;

  debugGui.add(this, 'spawnBonfire');
  debugGui.add(this, 'fuckingMeteors');

  var container = document.createElement( 'div' );
  document.body.appendChild( container );

  var controls = new THREE.FreeFlyControls(camera);
  controls.movementSpeed = 100;
  controls.domElement = container;
  controls.rollSpeed = Math.PI / 24;
  controls.autoForward = false;
  controls.dragToLook = false;
  self.controls = controls;

  camera.position.x = 5150;
  camera.position.y = 5333;
  camera.position.z = 39;

  if (1) {
    var wm = new WorldManager();
    wm.rootObj.position.set(5200, 5200, 0);
    wm.setMap(5, function ()
    {
      console.log('Map Ready');
    });
    this.world = wm;
    scene.add(wm.rootObj);

    var charObj = new CharPawn();
    charObj.setGender(0, function ()
    {
      charObj.setModelPart(3, 1);
      charObj.setModelPart(4, 1);
      charObj.setModelPart(5, 1);
      charObj.setModelPart(7, 202);
      charObj.setModelPart(8, 2);

      var animPath = '3DData/Motion/Avatar/EMPTY_STOP1_M1.ZMO';
      AnimationData.load(animPath, function (zmoData)
      {
        var anim = new SkeletonAnimator(charObj.skel, zmoData);
        anim.play();
      });
    });
    charObj.rootObj.position.set(5205, 5285, -5);
    charObj.rootObj.rotateOnAxis(new THREE.Vector3(0, 0, 1), Math.PI);
    charObj.rootObj.scale.set(1.2, 1.2, 1.2);
    EffectManager.loadEffectByIdx(302, function(effect) {
      effect.play();
      charObj.rootObj.add(effect.rootObj);
    });

    scene.add(charObj.rootObj);
  }
};

ParticleTestState.prototype.leave = function() {

};

ParticleTestState.prototype.update = function(delta) {
  this.controls.update( delta );

  if (this.world && this.world.isLoaded) {
    this.world.setViewerInfo(camera.position);
    this.world.update(delta);
  }
};

StateManager.register('particle', ParticleTestState);
