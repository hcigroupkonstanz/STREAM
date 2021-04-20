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
		Cull Back
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
            #pragma geometry geo
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

            struct v2g
            {
				UNITY_VERTEX_INPUT_INSTANCE_ID
                float4 vertex : SV_POSITION;
                float2 uv : TEXCOORD0;
                float4 worldPos : TEXCOORD1;
            };

            struct g2f
            {
				UNITY_VERTEX_INPUT_INSTANCE_ID
                UNITY_VERTEX_OUTPUT_STEREO
                float4 position : SV_POSITION;
                float2 uv : TEXCOORD0;
                float4 worldPos : TEXCOORD1;
            };

            v2g vert (Input input)
            {
                v2g output;

				UNITY_INITIALIZE_OUTPUT(v2g, output);
				UNITY_SETUP_INSTANCE_ID(input);
				UNITY_TRANSFER_INSTANCE_ID(input, output);

                output.vertex = input.vertex;
                output.worldPos = mul(unity_ObjectToWorld, input.vertex);
                output.uv = TRANSFORM_TEX(input.uv, _colorTex);
                return output;
            }

            [maxvertexcount(24)]
            void geo(triangle v2g IN[3], inout TriangleStream<g2f> tristream)
            {
                g2f o;

				UNITY_INITIALIZE_OUTPUT(g2f, o);
				UNITY_SETUP_INSTANCE_ID(IN[0]);
				UNITY_SETUP_INSTANCE_ID(IN[1]);
				UNITY_SETUP_INSTANCE_ID(IN[2]);
				UNITY_INITIALIZE_VERTEX_OUTPUT_STEREO(o);

                float3 offset = float3(0, 0, _randomOffset + _isSelectedOffset * 0.02);

                // front
                o.position = UnityObjectToClipPos(IN[1].vertex + offset);
                o.uv = IN[1].uv;
                o.worldPos = IN[1].worldPos;
				UNITY_TRANSFER_INSTANCE_ID(IN[1], o);
                tristream.Append(o);

                o.position = UnityObjectToClipPos(IN[0].vertex + offset);
                o.uv = IN[0].uv;
				o.worldPos = IN[0].worldPos;
				UNITY_TRANSFER_INSTANCE_ID(IN[0], o);
                tristream.Append(o);

                o.position = UnityObjectToClipPos(IN[2].vertex + offset);
                o.uv = IN[2].uv;
                o.worldPos = IN[2].worldPos;
				UNITY_TRANSFER_INSTANCE_ID(IN[2], o);
                tristream.Append(o);

                tristream.RestartStrip();


                // back
                o.position = UnityObjectToClipPos(IN[0].vertex - offset);
                o.uv = IN[0].uv;
                o.worldPos = IN[0].worldPos;
				UNITY_TRANSFER_INSTANCE_ID(IN[0], o);
                tristream.Append(o);

                o.position = UnityObjectToClipPos(IN[1].vertex - offset);
                o.uv = IN[1].uv;
                o.worldPos = IN[1].worldPos;
				UNITY_TRANSFER_INSTANCE_ID(IN[1], o);
                tristream.Append(o);

                o.position = UnityObjectToClipPos(IN[2].vertex - offset);
                o.uv = IN[2].uv;
                o.worldPos = IN[2].worldPos;
				UNITY_TRANSFER_INSTANCE_ID(IN[2], o);
                tristream.Append(o);

                tristream.RestartStrip();
            }

            fixed4 frag (g2f input) : SV_Target
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

