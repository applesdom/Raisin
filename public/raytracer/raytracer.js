// DOM SETUP

var canvas = document.getElementById('canvas');
canvas.width = 400;
canvas.height = 400;
var ctx = canvas.getContext('2d');
for(let y = 0; y < canvas.height; y += 10) {
  for(let x = 0; x < canvas.width; x += 10) {
    let r = Math.floor(64 + Math.random() * 64);
    let g = Math.floor(64 + Math.random() * 64);
    let b = Math.floor(64 + Math.random() * 64);
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 10, 10);
  }
}

var textarea = document.getElementById('textarea');
var select = document.getElementById('select');
var scene_file_list = ['default_scene.txt', 's5.txt', 's6.txt', 'teapot.txt', 
                       'test1.txt', 'test2.txt', 'test3.txt', 'test4.txt'];
var scene_list = []
for(let i = 0; i < scene_file_list.length; i ++) {
  let file = scene_file_list[i];
  let req = new XMLHttpRequest();
  req.addEventListener('load', function() {
    let scene = [];
    let splitIndex = this.responseText.indexOf('\n');
    scene[0] = this.responseText.substring(0, splitIndex);
    scene[1] = this.responseText.substring(splitIndex + 1);
    scene_list.push(scene);
    select.innerHTML += `<option value=\"${scene[0]}\">${scene[0]}</option>`
    if(textarea.value == '') {
      textarea.value = scene[1];
    }
  });
  req.open('GET', `res/${file}`);
  req.send();
}
select.addEventListener('change', function(e) {
  for(const scene of scene_list) {
    if(scene[0] == e.target.value) {
      textarea.value = scene[1];
    }
  }
});

var checkbox_list = [document.getElementById('noaccel'),
                     document.getElementById('bbaccel'),
                     document.getElementById('bvhbalanceaccel'),
                     document.getElementById('bvhspatialaccel'),
                     document.getElementById('bvhsahaccel')];
for(let i = 0; i < checkbox_list.length; i ++) {
  checkbox_list[i].addEventListener('change', function(e) {
    if(e.target.checked) {
      for(let j = 0; j < checkbox_list.length; j ++) {
        if(i !== j) {
          checkbox_list[j].checked = false;
        }
        use_accel = i;
      }
    } else {
      e.target.checked = true;
    }
  });
}

var button = document.getElementById('button');
button.innerText = 'Render Scene';
button.addEventListener('click', function(e) {
  if(button.innerText === 'Render Scene') {
    clear();
    for(const box of checkbox_list) {
      box.disabled = true;
    }
    parse_scene();
    button.innerText = 'Cancel';
  } else {
    rendering = false;
    for(const box of checkbox_list) {
      box.disabled = false;
    }
    button.innerText = 'Render Scene';
  }
});

var out = document.getElementById('out');
function print(message, color) {
  message = message.replace(/</g, '&lt');
  message = message.replace(/>/g, '&gt');
  let text;
  if(color == undefined) {
    text = `<p>${message}</p>`;
  } else {
    text = `<p style=\"color: ${color};\">${message}</p>`;
  }
  out.innerHTML += text;
  out.scrollTop = out.scrollHeight;
}
function clear() {
  out.innerHTML = '';
}

// GLOBAL VARIABLES

var img_width = 400;
var img_height = 400;
var img_scale = 1;
var cam = new function() {
  this.pos = new Vector(0, 0, 0);
  this.dir = new Vector(1, 0, 0);
  this.up = new Vector(0, 1, 0);
  this.fov = 60;
}
var bg_rgb = new Vector(0.7, 0.5, 0.2)
var bg_fade = true;
var material_list = [];
var primitive_list = [];
var light_list = [];
var ir_stack = [];
var rendering = false;

var texture_map = new Map();
for(let i = 0; i < 3; i ++) {
  let fill1, fill2, name;
  switch(i) {
  case 0:
    fill1 = '#ffffff';
    fill2 = '#404040';
    name = 'tile1';
    break;
  case 1:
    fill1 = '#ffff00';
    fill2 = '#00ff00';
    name = 'tile2';
    break;
  case 2:
    fill1 = '#ffff00';
    fill2 = '#ff0000';
    name = 'tile3';
    break;
  }

  let texture = document.createElement('canvas')
  texture.width = 2;
  texture.height = 2;
  let texture_ctx = texture.getContext('2d');
  texture_ctx.fillStyle = fill1;
  texture_ctx.fillRect(0, 0, 1, 1);
  texture_ctx.fillRect(1, 1, 1, 1);
  texture_ctx.fillStyle = fill2;
  texture_ctx.fillRect(1, 0, 1, 1);
  texture_ctx.fillRect(0, 1, 1, 1);
  texture_map.set(name, texture_ctx.getImageData(0, 0, 2, 2));
}

var use_accel = 0;
var accel = null;

var mtl_map = new Map();
var default_mtl = new Material();
default_mtl.rgb = new Vector(1, 1, 1);
default_mtl.ka = 0.1;
default_mtl.kd = 0.5;
default_mtl.ks = 0.3;
default_mtl.n = 4;
default_mtl.opacity = 1.0;
default_mtl.ir = 1.0;

// FUNCTIONS

function parse_scene() {
  img_scale = 1;
  light_list.length = 0;
  primitive_list.length = 0;
  ir_stack.length = 0;
  ir_stack.push(1.0);
  let v_list = [];
  let vt_list = [];
  let n_list = [];
  let cur_mtl = Object.assign(new Material(), default_mtl);
  let cur_texture = null;
  let line_number = 0;
  for(let line of textarea.value.split('\n')) {
    line_number ++;
    if(line.charAt(0) == '#' || line == '') {
      continue;
    }
    line = line.split(/\s*#/gm)[0];
    let token_list = line.split(' ');
    if(token_list[token_list.length - 1] == '') {
      token_list.length --;
    }
    error_message = null;
    switch(token_list[0]) {
    case 'campos':
      if(token_list.length === 4) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        if(x !== NaN && y !== NaN && z !== NaN) {
          cam.pos = new Vector(x, y, z);
          break;
        }
      }
      error_message = 'Expected format: campos <x> <y> <z>';
      break;
    case 'camdir':
      if(token_list.length === 4) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        if(x !== NaN && y !== NaN && z !== NaN) {
          cam.dir = new Vector(x, y, z).unit();
          break;
        }
      }
      error_message = 'Expected format: camdir <x> <y> <z>';
      break;
    case 'camto':
    case 'camtoward':
    case 'camtowards':
      if(token_list.length === 4) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        if(x !== NaN && y !== NaN && z !== NaN) {
          cam.dir = new Vector(x, y, z).sub(cam.pos).unit();
          break;
        }
      }
      error_message = 'Expected format: camdir <x> <y> <z>';
      break;
    case 'updir':
      if(token_list.length === 4) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        if(x !== NaN && y !== NaN && z !== NaN) {
          cam.up = new Vector(x, y, z).unit();
          break;
        }
      }
      error_message = 'Expected format: updir <x> <y> <z>';
      break;
    case 'fov':
      if(token_list.length === 2) {
        let degrees = Number(token_list[1]);
        if(degrees !== NaN) {
          if(0 < degrees && degrees < 180) {
            cam.fov = degrees;
          } else {
            error_message = 'Invalid field of view';
          }
          break;
        }
      }
      error_message = 'Expected format: fov <degrees>';
      break;
    case 'imgsize':
      if(token_list.length === 3) {
        let width = Number(token_list[1]);
        let height = Number(token_list[2]);
        if(width !== NaN && height !== NaN) {
          if(0 < width && 0 < height) {
            img_width = width;
            img_height = height;
          } else {
            error_message = 'Invalid width/height';
          }
          break;
        }
      }
      error_message = 'Expected format: imgsize <width> <height>';
      break;
    case 'imgscale':
      if(token_list.length === 2) {
        let scale = Number(token_list[1]);
        if(scale !== NaN) {
          if(0 < scale) {
            img_scale = scale;
          } else {
            error_message = 'Invalid scale';
          }
          break;
        }
      }
      error_message = 'Expected format: imgscale <scale>';
      break;
    case 'bgcolor':
      if(token_list.length === 4) {
        let r = Number(token_list[1]);
        let g = Number(token_list[2]);
        let b = Number(token_list[3]);
        if(r !== NaN && g !== NaN && b != NaN) {
          if(0 <= r && r < 256 && 0 <= g && g < 256 && 0 <= b && b < 256) {
            if(r <= 1.0 && g <= 1.0 && b <= 1.0) {
              bg_rgb = new Vector(r, g, b);
            } else {
              bg_rgb = new Vector(r/255.0, g/255.0, b/255.0);
            }
          } else {
            error_message = 'Background color component out of range';
          }
          break;
        }
      }
      error_message = 'Expected format: bgcolor <r> <g> <b>';
      break;
    case 'bgfade':
      if(token_list.length === 2) {
        let flag = token_list[1];
        if(flag === '0' || flag === 'false') {
          bg_fade = 0;
        } else if(flag === '1' || flag === 'true') {
          bg_fade = 1;
        } else {
          error_message = 'Invalid background fade flag, boolean expected';
        }
        break;
      }
      error_message = 'Expected format: bgfade <boolean>';
      break;
    case 'light':
      if(token_list.length === 7) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        let r = Number(token_list[4]);
        let g = Number(token_list[5]);
        let b = Number(token_list[6]);
        if(x !== NaN && y !== NaN && z !== NaN && r !== NaN && g !== NaN && b != NaN) {
          if(0 <= r && r < 256 && 0 <= g && g < 256 && 0 <= b && b < 256) {
            let light = new PointLight(new Vector(x, y, z), null);
            if(r <= 1.0 && g <= 1.0 && b <= 1.0) {
              light.rgb = new Vector(r, g, b);
            } else {
              light.rgb = new Vector(r/255.0, g/255.0, b/255.0);
            }
            light_list.push(light);
          } else {
            error_message = 'Light color component out of range';
          }
          break;
        }
      }
      error_message = 'Expected format: light <x> <y> <z> <r> <g> <b>';
      break;
    case 'dirlight':
    case 'envlight':
      if(token_list.length === 7) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        let r = Number(token_list[4]);
        let g = Number(token_list[5]);
        let b = Number(token_list[6]);
        if(x !== NaN && y !== NaN && z !== NaN && r !== NaN && g !== NaN && b != NaN) {
          if(0 <= r && r < 256 && 0 <= g && g < 256 && 0 <= b && b < 256) {
            let light = new DirLight(new Vector(x, y, z), null);
            if(r <= 1.0 && g <= 1.0 && b <= 1.0) {
              light.rgb = new Vector(r, g, b);
            } else {
              light.rgb = new Vector(r/255.0, g/255.0, b/255.0);
            }
            light_list.push(light);
          } else {
            error_message = 'Light color component out of range';
          }
          break;
        }
      }
      error_message = 'Expected format: dirlight <x> <y> <z> <r> <g> <b>';
      break;
    case 'spotlight':
      if(token_list.length === 7) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        let dx = Number(token_list[4]);
        let dy = Number(token_list[5]);
        let dz = Number(token_list[6]);
        let t = Number(token_list[7]);
        let r = Number(token_list[8]);
        let g = Number(token_list[9]);
        let b = Number(token_list[10]);
        if(x !== NaN && y !== NaN && z !== NaN && dx !== NaN && dy !== NaN && dz !== NaN
                     && t !== NaN && r !== NaN && g !== NaN && b != NaN) {
          if(0 < t && t < 360) {
            if(0 <= r && r < 256 && 0 <= g && g < 256 && 0 <= b && b < 256) {
              let light = new SpotLight(new Vector(x, y, z), new Vector(dx, dy, dz), t, null);
              if(r <= 1.0 && g <= 1.0 && b <= 1.0) {
                light.rgb = new Vector(r, g, b);
              } else {
                light.rgb = new Vector(r/255.0, g/255.0, b/255.0);
              }
              light_list.push(light);
            } else {
              error_message = 'Light color component out of range';
            }
          } else {
            error_message = 'Theta must be in range 0-180';
          }
          break;
        }
      }
      error_message = 'Expected format: spotlight <x> <y> <z> <r> <g> <b>';
      break;
    case 'mtlcolor':
      if(token_list.length === 4) {
        let r = Number(token_list[1]);
        let g = Number(token_list[2]);
        let b = Number(token_list[3]);
        if(r !== NaN && g !== NaN && b != NaN) {
          if(0 <= r && r < 256 && 0 <= g && g < 256 && 0 <= b && b < 256) {
            if(r <= 1.0 && g <= 1.0 && b <= 1.0) {
              cur_mtl = Object.assign(new Material(), cur_mtl);
              cur_mtl.rgb = new Vector(r, g, b);
            } else {
              cur_mtl = Object.assign(new Material(), cur_mtl);
              cur_mtl.rgb = new Vector(r/255.0, g/255.0, b/255.0);
            }
          } else {
            error_message = 'Material color component out of range';
          }
          break;
        }
      }
      error_message = 'Expected format: mtlcolor <r> <g> <b>';
      break;
    case 'mtlphong':
      if(token_list.length === 5) {
        let ka = Number(token_list[1]);
        let kd = Number(token_list[2]);
        let ks = Number(token_list[3]);
        let n = Number(token_list[4]);
        if(ka !== NaN && kd !== NaN && ks != NaN && n != NaN) {
          if(0 <= ka && ka <= 1.0 && 0 <= kd && kd <= 1.0 && 0 <= ks && ks <= 1.0) {
            if(0 < n) {
              cur_mtl = Object.assign(new Material(), cur_mtl);
              cur_mtl.ka = ka;
              cur_mtl.kd = kd;
              cur_mtl.ks = ks;
              cur_mtl.n = n;
            } else {
              error_message = 'shininess constant must be greater than 0';
            }
          } else {
            error_message = 'k constants must be in range 0-1';
          }
          break;
        }
      }
      error_message = 'Expected format: mtlphong <ka> <kd> <ks> <n>';
      break;
    case 'mtloptics':
      if(token_list.length === 3) {
        let opacity = Number(token_list[1]);
        let ir = Number(token_list[2]);
        if(opacity !== NaN && ir !== NaN) {
          if(0.0 <= opacity && opacity <= 1.0) {
            if(0.0 < ir) {
              cur_mtl = Object.assign(new Material(), cur_mtl);
              cur_mtl.opacity = opacity;
              cur_mtl.ir = ir;
            } else {
              error_message = 'Index of refraction must be positive';
            }
          } else {
            error_message = 'Opacity must be in range 0-1';
          }
          break;
        }
      }
      error_message = 'Expected format: mtloptics <opacity> <ir>';
      break;
    case 'mtlname':
      if(token_list.length === 2) {
        let name = token_list[1];
        let found = false;
        for(entry of mtl_map.entries()) {
          if(entry[0] == name) {
            entry[1] = cur_mtl;
            cur_mtl = Object.assign(new Material(), cur_mtl);
            found = true;
            break;
          }
        }
        if(!found) {
          mtl_map.set(name, cur_mtl)
          cur_mtl = Object.assign(new Material(), cur_mtl);
        }
        break;
      }
      error_message = 'Expected format: mtlname <name>';
      break;
    case 'usemtl':
      if(token_list.length === 2) {
        let name = token_list[1];
        let found = false;
        for(entry of mtl_map.entries()) {
          if(entry[0] == name) {
            cur_mtl = entry[1];
            found = true;
            break;
          }
        }
        if(!found) {
          error_message = 'Material name not found';
        }
        break;
      }
      error_message = 'Expected format: usemtl <name>';
      break;
    case 'sphere':
      if(token_list.length === 5) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        let radius = Number(token_list[4]);
        if(x !== NaN && y !== NaN && z !== NaN && radius) {
          if(0 < radius) {
            primitive_list.push(new Sphere(new Vector(x, y, z), radius, cur_mtl));
          } else {
            error_message = 'Sphere radius cannot be negative';
          }
          break;
        }
      }
      error_message = 'Expected format: sphere <x> <y> <z> <radius>';
      break;
    case 'v':
      if(token_list.length === 4) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        if(x !== NaN && y !== NaN && z !== NaN) {
          v_list.push(new Vector(x, y, z));
          break;
        }
      }
      error_message = 'Expected format: v <x> <y> <z>';
      break;
    case 'vt':
      if(token_list.length === 3) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        if(x !== NaN && y !== NaN) {
          vt_list.push(new Vector(x, y, 0));
          break;
        }
      }
      error_message = 'Expected format: vt <x> <y>';
      break;
    case 'n':
      if(token_list.length === 4) {
        let x = Number(token_list[1]);
        let y = Number(token_list[2]);
        let z = Number(token_list[3]);
        if(x !== NaN && y !== NaN && z !== NaN) {
          n_list.push(new Vector(x, y, z));
          break;
        }
      }
      error_message = 'Expected format: n <x> <y> <z>';
      break;
    case 'f':
      if(token_list.length === 4) {
        let v1, v2, v3, t1 = NaN, t2 = NaN, t3 = NaN, n1 = NaN, n2 = NaN, n3 = NaN;
        let a = token_list[1].split('/');
        let b = token_list[2].split('/');
        let c = token_list[3].split('/');
        v1 = Number(a[0]);
        v2 = Number(b[0]);
        v3 = Number(c[0]);
        if(1 < a.length && 1 < b.length && 1 < c.length) { 
          t1 = Number(a[1]);
          t2 = Number(b[1]);
          t3 = Number(c[1]);
        } 
        if(2 < a.length && 2 < b.length && 2 < c.length) {
          n1 = Number(a[2]);
          n2 = Number(b[2]);
          n3 = Number(c[2]);
        }

        if(!isNaN(v1) && !isNaN(v2) && !isNaN(v3)) {
          if(v1 < 0) {v1 += v_list.length + 1;}
          if(v2 < 0) {v2 += v_list.length + 1;}
          if(v3 < 0) {v3 += v_list.length + 1;}
          if(v1 <= v_list.length && v2 <= v_list.length && v3 <= v_list.length) {
            let face = new Face(v_list[v1-1], v_list[v2-1], v_list[v3-1],
                                null, null, null, null, null, null, cur_mtl, null);
            if(cur_texture !== null && !isNaN(t1) && !isNaN(t2) && !isNaN(t3)) {
              if(t1 < 0) {t1 += vt_list.length + 1;}
              if(t2 < 0) {t2 += vt_list.length + 1;}
              if(t3 < 0) {t3 += vt_list.length + 1;}
              if(t1 <= vt_list.length && t2 <= vt_list.length && t3 <= vt_list.length) {
                face.t1 = vt_list[t1-1];
                face.t2 = vt_list[t2-1];
                face.t3 = vt_list[t3-1];
                face.img = cur_texture;
              } else {
                error_message = 'Invalid texture vertex index'
              }
            }
            if(!isNaN(n1) && !isNaN(n2) && !isNaN(n3)) {
              if(n1 < 0) {n1 += vn_list.length + 1;}
              if(n2 < 0) {n2 += vn_list.length + 1;}
              if(n3 < 0) {n3 += vn_list.length + 1;}
              if(n1 <= vn_list.length && n2 <= vn_list.length && n3 <= vn_list.length) {
                face.n1 = vn_list[n1-1];
                face.n2 = vn_list[n2-1];
                face.n3 = vn_list[n3-1];
              } else {
                error_message = 'Invalid normal vertex index'
              }
            }
            primitive_list.push(face);
          } else {
            error_message = 'Invalid vertex index'
          }
          break;
        }
      }
      error_message = 'Expected format: f <v1>/<t1>/<n1> <v2>/<t2>/<n2> <v3>/<t3>/<n3>';
      break;
    case 'texture':
      if(token_list.length === 2) {
        let name = token_list[1];
        if(name == 'none') {
          cur_texture = null;
          break;
        }
        let found = false;
        for(entry of texture_map.entries()) {
          if(entry[0] == name) {
            cur_texture = entry[1];
            found = true;
            break;
          }
        }
        if(!found) {
          error_message = 'Texture not found';
        }
        break;
      }
      error_message = 'Expected format: texture <name>';
    default:
      error_message = 'Unrecognized input token';
      break;
    }
    if(error_message != null) {
      print(`Line ${line_number}: ${error_message}`, 'red');
    }
  }
  let start_time;
  if(use_accel !== 0) {
    start_time = window.performance.now();
    print('Building acceleration structure...');
  }
  setTimeout(function() {
    switch(use_accel) {
    case 1:
      accel = new BoundingBoxAccelerator(primitive_list);
      break;
    case 2:
      accel = new BVHAccelerator(primitive_list, 'balance');
      break;
    case 3:
      accel = new BVHAccelerator(primitive_list, 'spatial');
      break;
    case 4:
      accel = new BVHAccelerator(primitive_list, 'sah');
      break;
    default:
      accel = new NoAccelerator(primitive_list);
    }
    if(use_accel !== 0) {
      let elapsed_time = ((window.performance.now() - start_time) / 1000).toFixed(3);
      print(`Structure built in ${elapsed_time}s`);
    }
    render_scene();
  }, 100);
}

function sample(pos, dir, depth, importance) {
  // Get closest ray-surface collision (as col)
  let col = accel.getCollision(pos, dir);
  if(col == null) {
    // If no collision, return background color
    if(bg_fade) {
      return bg_rgb.mul(0.5 * (dir.unit().dot(cam.up) + 1.0));
    } else {
      return bg_rgb;
    }
  } else {
    // If collision...
    let a_rgb = col.mtl.rgb.mul(col.mtl.ka);
    let d_rgb = new Vector(0, 0, 0);
    let s_rgb = new Vector(0, 0, 0);
    let i = dir.scale(-1);
    let r = col.normal.mul(i.dot(col.normal)*2).sub(i).unit();
    if(!col.internal) {
      for(const light of light_list) {
        let ill = light.getIllumination(col.pos);
        if(ill == null) {
          continue;
        }
        let shadow_pos = col.pos.add(ill.dir.mul(0.0001));
        let shadow = accel.getOcclusion(shadow_pos, ill.dir, ill.sqrdis);
        if(shadow > 0) {
          let dot = ill.dir.dot(col.normal);
          if(dot > 0) {
            d_rgb = d_rgb.add(col.mtl.rgb.mulv(ill.rgb.mul(dot * col.mtl.kd)).mul(shadow));
            dot = r.dot(ill.dir);
            if(dot > 0) {
              s_rgb = s_rgb.add(ill.rgb.mul(Math.pow(dot, col.mtl.n) * col.mtl.ks).mul(shadow));
            }
          }
        }
      }
    }
    let r_rgb = new Vector(0, 0, 0);
    let t_rgb = new Vector(0, 0, 0);
    if(depth < 64) {
      let ir, ir_ratio;
      if(col.internal) {
        ir = ir_stack[ir_stack.length - 2];
        ir_ratio = col.mtl.ir/ir;
      } else {
        ir = ir_stack[ir_stack.length - 1];
        ir_ratio = ir/col.mtl.ir;
      }
      let radicand = 1 - ir_ratio*ir_ratio*(col.normal.cross(i.mul(-1)).sqrmag());
      let t = col.normal.cross(col.normal.cross(i)).mul(ir_ratio).sub(col.normal.mul(Math.sqrt(radicand)));
      let r0 = Math.pow((ir - col.mtl.ir) / (ir + col.mtl.ir), 2);
      let fr;
      if(1.0 < ir_ratio) {
        if(radicand < 0) {
          fr = 1.0;
        } else {
          fr = r0 + (1 - r0)*Math.pow(1.0 - t.dot(col.normal.mul(-1)), 5);
        }
      } else {
        fr = r0 + (1 - r0)*Math.pow(1.0 - i.dot(col.normal), 5);
      }
      let new_importance = fr * importance;
      if(0.004 < new_importance) {
        r_rgb = sample(col.pos.add(col.normal.mul(0.0001)), r, depth + 1, new_importance).mul(fr);
      }
      new_importance = (1 - fr) * (1 - col.mtl.opacity) * importance;
      if(col.mtl.opacity < 1.0 && 0 < radicand && 0.004 < new_importance) {
        let ir_temp;
        if(col.internal) {
          ir_temp = ir_stack[ir_stack.length - 1];
          ir_stack.length --;
        } else {
          ir_stack.push(col.mtl.ir);
        }
        t_rgb = sample(col.pos.sub(col.normal.mul(0.0001)), t, depth + 1, new_importance).mul((1 - fr) * (1 - col.mtl.opacity));
        if(col.internal) {
          ir_stack.push(ir_temp);
        } else {
          ir_stack.length --;
        }
      }
    }

    return a_rgb.add(d_rgb).add(s_rgb).add(r_rgb).add(t_rgb);
  }
}

function render_scene(max_time) {
  let start_time = window.performance.now();
  print('Starting render...');
  rendering = true;

  // Calculate camera view math
  let d = img_width / (2.0 * Math.tan(cam.fov * 0.00872664625));
  let u = cam.dir.cross(cam.up).unit();
  let v = cam.dir.cross(u).unit();
  let origin_dir = cam.dir.scale(d).sub(u.mul((img_width - 1)/2.0)).sub(v.mul((img_height - 1)/2.0));

  // Begin render loop
  canvas.width = img_width * img_scale;
  canvas.height = img_height * img_scale;
  ctx.save();
  ctx.scale(img_scale, img_scale);
  let x = 0, y = 0;
  let render_pixel = function() {
    let frame_time = window.performance.now();
    while(rendering && window.performance.now() - frame_time < 100) {
      let dir = origin_dir.add(u.mul(x)).add(v.mul(y));
      let rgb = sample(cam.pos, dir, 0, 1);
      let r = Math.floor(Math.min(rgb.x, 1.0) * 255);
      let g = Math.floor(Math.min(rgb.y, 1.0) * 255);
      let b = Math.floor(Math.min(rgb.z, 1.0) * 255);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);

      x ++;
      if(img_width <= x) {
        x = 0;
        y ++;
        if(img_height <= y) {
          ctx.restore();
          let elapsed_time = ((window.performance.now() - start_time) / 1000).toFixed(3);
          print(`Rendering finished in ${elapsed_time}s`);
          rendering = false;
          button.innerText = 'Render Scene';
          for(const box of checkbox_list) {
            box.disabled = false;
          }
          return;
        }
      }
    }
    if(rendering) {
      window.requestAnimationFrame(render_pixel);
    } else {
      print('Rendering cancelled');
    }
  }
  window.requestAnimationFrame(render_pixel);
}

