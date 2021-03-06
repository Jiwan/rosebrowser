'use strict';

/**
 * An Animator class for animating Object3D's based on an AnimationData.
 *
 * Note: Internally makes use of the THREE.Animation class.
 *
 * @constructor
 * @param {THREE.Object3D} object
 * The object to animate.
 * @param {AnimationData} animationData
 * The AnimationData to animate the geometry with.
 */
function ObjectAnimator(object, animationData) {
  this.animation =
      ObjectAnimator._createThreeAnimation(object, animationData);
}

/**
 * Starts playing the animation.
 * @param {number} [startTime]
 */
ObjectAnimator.prototype.play = function(startTime) {
  this.animation.play(startTime);
};

/**
 * Pauses the animation
 */
ObjectAnimator.prototype.pause = function() {
  this.animation.pause();
};

/**
 * Stops playing the animation
 */
ObjectAnimator.prototype.stop = function() {
  this.animation.stop();
};

/**
 * An index of all created object animators, incrememnted for each
 * to ensure a unique animation name for all.
 *
 * @type {number}
 * @private
 */
ObjectAnimator._animIdx = 1;

/**
 * @param skeleton
 * @param {AnimationData} animationData
 * @private
 */
ObjectAnimator._createThreeAnimation = function(object, animationData) {
  var animD = {
    name: 'ObjAnim_' + ObjectAnimator._animIdx++,
    fps: animationData.fps,
    length: animationData.frameCount / animationData.fps,
    hierarchy: []
  };

  var animT = {
    keys: []
  };
  var b = object;
  for (var j = 0; j < animationData.frameCount; ++j) {
    animT.keys.push({
      time: j / animationData.fps,
      pos: [b.position.x, b.position.y, b.position.z],
      rot: [b.quaternion.x, b.quaternion.y, b.quaternion.z, b.quaternion.w],
      scl: [b.scale.x, b.scale.y, b.scale.z]
    });
  }
  animD.hierarchy.push(animT);

  // Apply the channel transformations
  for (var j = 0; j < animationData.channels.length; ++j) {
    var c = animationData.channels[j];
    for (var i = 0; i < animationData.frameCount; ++i) {
      if (c.index != 0) {
        console.log('bad index');
      }
      var thisKey = animD.hierarchy[c.index].keys[i];
      switch (c.type) {
        case AnimationData.CHANNEL_TYPE.Position:
          thisKey.pos = [c.frames[i].x, c.frames[i].y, c.frames[i].z];
          break;
        case AnimationData.CHANNEL_TYPE.Rotation:
          thisKey.rot = [c.frames[i].x, c.frames[i].y, c.frames[i].z, c.frames[i].w];
          break;
        case AnimationData.CHANNEL_TYPE.Scale:
          thisKey.scl = [c.frames[i].x, c.frames[i].y, c.frames[i].z];
          break;
      }
    }
  }

  // Create the actual animation, we use a dummy root object since we manually
  //   configure the animated hierarchy below.
  var anim = new THREE.Animation({children: []}, animD);
  anim.hierarchy = [object];
  return anim;
};
