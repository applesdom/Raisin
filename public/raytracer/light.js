function Illumination() {
  this.sqrdis = 0.0;
  this.dir = new Vector(0, 0, 0);
  this.rgb = new Vector(1.0, 1.0, 1.0);
}

function PointLight(pos, rgb) {
  this.pos = pos;
  this.rgb = rgb;

  this.getIllumination = function(pos) {
    let ill = new Illumination();
    let dir = this.pos.sub(pos);
    ill.sqrdis = dir.sqrmag();
    ill.dir = dir.unit();
    ill.rgb = this.rgb;
    return ill;
  }
}

function DirLight(dir, rgb) {
  this.dir = dir.scale(-1);
  this.rgb = rgb;
  
  this.getIllumination = function(pos) {
    let ill = new Illumination();
    ill.sqrdis = Number.POSITIVE_INFINITY;
    ill.dir = this.dir;
    ill.rgb = this.rgb;
    return ill;
  }
}

function SpotLight(pos, dir, angle, rgb) {
  this.pos = pos;
  this.dir = dir.unit();
  this.max_cos = Math.cos(0.0174*(180 - angle/2));
  this.rgb = rgb;

  this.getIllumination = function(pos) {
    let dir = this.pos.sub(pos).unit();
    if(this.dir.dot(dir) / dir.mag() < this.max_cos) {
      let ill = new Illumination();
      ill.sqrdis = dir.sqrmag();
      ill.dir = dir;
      ill.rgb = this.rgb;
      return ill;
    }
    return null;
  }
}
