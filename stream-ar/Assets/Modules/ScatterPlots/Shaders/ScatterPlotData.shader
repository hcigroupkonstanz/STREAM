Shader "Graph/ScatterPlotData"
{
	Properties
	{
		_dataSize("Size", Range(0.001, 0.02)) = 0.01
		_nullOffset("Null Offset", Range(-0.5, -0.01)) = -0.05
		_borderSize("BorderSize", Range(0.01, 1.0)) = 0.15

		[PerRendererData] _dataCount("INTERNAL", Float) = 0
		[PerRendererData] _dataPos("INTERNAL", 2D) = "white" {}
		[PerRendererData] _dataNull("INTERNAL", 2D) = "white" {}
		[PerRendererData] _dataColor("INTERNAL", 2D) = "white" {}
		[PerRendererData] _dataIndices("INTERNAL", 2D) = "white" {}
		[PerRendererData] _localToWorld("INTERNAL", Float) = 0
	}

	SubShader
	{
		Cull Back
		Lighting Off
		ZWrite On
		Blend One OneMinusSrcAlpha

		Pass
		{
			Tags
			{
				"Queue" = "Geometry"
				"RenderType" = "Opaque"
				"IgnoreProjectors" = "True"
			}

			CGPROGRAM

			#pragma vertex vert
			#pragma fragment frag
			#pragma multi_compile_fwdbase nolightmap nodirlightmap nodynlightmap novertexlight
			#pragma multi_compile_instancing
			#pragma target 4.0

			#include "UnityCG.cginc"


			uniform uint _dataCount;
			uniform float _dataSize;
			uniform float _nullOffset;
			uniform float _borderSize;
			uniform sampler2D _dataPos;
			uniform sampler2D _dataNull;
			uniform sampler2D _dataColor;
			uniform sampler2D _dataIndices;
			uniform float4x4 _localToWorld;


			struct Input
			{
				float4 vertex : POSITION;
				float2 uv : TEXCOORD0;
			};

			struct v2f
			{
				float4 pos : SV_POSITION;
				float2 instanceID : TEXCOORD0;
				float2 uv : TEXCOORD1;
			};



			v2f vert(Input input, uint instanceID : SV_InstanceID)
			{
				float4 dataOffset = float4(0.5, 0.5, 0, 0);
				float count = ((float)(instanceID)) / max(_dataCount - 1, 1);

                // float4 color = tex2Dlod(_dataColor, fixed4(count, 0, 0, 0));


				// position on scatter plot
				float randomOffset = sin(instanceID) / 1000.; // avoid z-fighting issues
				float3 localPosition = input.vertex.xyz * (_dataSize + randomOffset);
				float3 dataPosition = tex2Dlod(_dataPos, float4(count, 0, 0, 0)) - dataOffset;
				// avoid further z-fighting issues
				dataPosition += float3(randomOffset, randomOffset, randomOffset);

				// null area
				float3 isNull = tex2Dlod(_dataNull, float4(count, 0, 0, 0));
				float3 nullOffset = float3(_nullOffset, _nullOffset, _nullOffset) - dataOffset;

				// final position
				localPosition += isNull * nullOffset + (1 - isNull) * dataPosition;

				float3 worldPos = mul(_localToWorld, float4(localPosition, 1));
				float3 dataIndex = tex2Dlod(_dataIndices, float4(count, 0, 0, 0));

				v2f output;
				output.pos = UnityObjectToClipPos(worldPos);
				output.instanceID = float2(dataIndex.x, 0);
				output.uv = input.uv;
				return output;
			}


			fixed4 frag(v2f i) : SV_Target
			{
				fixed4 col = tex2D(_dataColor, i.instanceID);
				// white outline to make points visible within filter
				fixed isBorder = min(1,
					step(i.uv.x, _borderSize)
					+ step(i.uv.y, _borderSize)
					+ step(1 - i.uv.x, _borderSize)
					+ step(1 - i.uv.y, _borderSize));

				return col * (1 - isBorder) + fixed4(1, 1, 1, 1) * isBorder;
			}

			ENDCG
		}
	}
}