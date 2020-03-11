precision mediump float;

varying vec2 fragTexCoord;
varying vec3 fragNormal;

uniform sampler2D sampler;
uniform vec3 ambientIntensity;
uniform vec3 sunIntensity;
uniform vec3 sunDirection;

void main()
{
  vec3 surfaceNormal = normalize(fragNormal);
  vec4 texel = texture2D(sampler, fragTexCoord);
  vec3 lightintensity = ambientIntensity + sunIntensity *  max(dot(fragNormal, sunDirection), 0.0);
  gl_FragColor = vec4(texel.rgb * lightintensity, texel.a);
}