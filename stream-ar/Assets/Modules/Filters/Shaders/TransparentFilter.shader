Shader "Filter/TransparentFilter"
{
    Properties
    {
        _transparency ("Transparency", Range(0, 1)) = 0.4
		[PerRendererData] _randomOffset("INTERNAL", Float) = 0.
		[PerRendererData] _isSelectedOffset("INTERNAL", Float) = 0.
		[PerRendererData] _colorTex ("INTERNAL", 2D) = "white" {}
    }


    SubShader
    {
		Cull Off
		Lighting Off
		ZWrite On
		Blend One OneMinusSrcAlpha

        Pass {
			Tags
			{
				"Queue" = "Transparent"
				"RenderType" = "Transparent"
				"IgnoreProjectors" = "True"
			}


            ColorMask ARGB

            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
			#pragma target 4.0

            #include "UnityCG.cginc"

            uniform float _transparency;
            uniform float _randomOffset;
            uniform float _isSelectedOffset;
			sampler2D _colorTex;
            float4 _colorTex_ST;

            struct Input
            {
				UNITY_VERTEX_INPUT_INSTANCE_ID
                float4 vertex : POSITION;
                float2 uv : TEXCOORD0;
            };

            struct v2f
            {
				UNITY_VERTEX_INPUT_INSTANCE_ID
                float4 vertex : SV_POSITION;
                float2 uv : TEXCOORD0;
                float4 worldPos : TEXCOORD1;
            };


            v2f vert (Input input)
            {
                v2f output;

				UNITY_INITIALIZE_OUTPUT(v2f, output);
				UNITY_SETUP_INSTANCE_ID(input);
				UNITY_TRANSFER_INSTANCE_ID(input, output);

                float3 offset = float3(0, 0, _randomOffset + _isSelectedOffset * 0.02);

                output.vertex = UnityObjectToClipPos(input.vertex + offset);
                output.worldPos = mul(unity_ObjectToWorld, input.vertex);
                output.uv = TRANSFORM_TEX(input.uv, _colorTex);
                return output;
            }


            fixed4 frag (v2f input) : SV_Target
            {
				UNITY_SETUP_INSTANCE_ID(input);

                float pos = lerp(input.uv.x, input.uv.y, 0.5) * 25;
                fixed value = floor(frac(pos) + 0.5);
                clip(value - 0.01 + step(_isSelectedOffset, 0.001));

                fixed4 color = tex2D(_colorTex, input.uv);
                return float4(color.xyz, _transparency);
            }

            ENDCG
        }
    }
 }

