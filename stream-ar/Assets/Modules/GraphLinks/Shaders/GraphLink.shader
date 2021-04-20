Shader "Graph/GraphLink"
{
	Properties
	{
		_lineWidth("LineWidth", Range(0., 0.1)) = 0.007
		_nullOffset("Null Offset", Range(-0.5, -0.01)) = -0.15
		_dottedOffset("Dotted Line Distance", Range(0, 100)) = 25

		[PerRendererData] _lineCount("INTERNAL", Float) = 1.
		[PerRendererData] _transparencyMultiplier("Transparency Multiplier", Range(0., 1.)) = 1.
		[PerRendererData] _startLocalToWorld("INTERNAL", Float) = 0
		[PerRendererData] _endLocalToWorld("INTERNAL", Float) = 0
		[PerRendererData] _posStart("INTERNAL", 2D) = "white" {}
		[PerRendererData] _posEnd("INTERNAL", 2D) = "white" {}
		[PerRendererData] _nullStart("INTERNAL", 2D) = "white" {}
		[PerRendererData] _nullEnd("INTERNAL", 2D) = "white" {}
		[PerRendererData] _color("INTERNAL", 2D) = "white" {}
		[PerRendererData] _indices("INTERNAL", 2D) = "white" {}
	}


	CGINCLUDE

	#include "UnityCG.cginc"

	uniform uint _lineCount;
	uniform float _lineWidth;
	uniform float _transparencyMultiplier;
	uniform float _nullOffset;
	uniform float _dottedOffset;

	uniform float4x4 _startLocalToWorld;
	uniform float4x4 _endLocalToWorld;

	uniform sampler2D _posStart;
	uniform sampler2D _posEnd;
	uniform sampler2D _nullStart;
	uniform sampler2D _nullEnd;
	uniform sampler2D _color;
	float4 _color_ST;

	uniform sampler2D _indices;



	struct Input
	{
		float4 vertex : POSITION;
		uint vertexId: SV_VertexID;
		float2 uv : TEXCOORD0;
	};

	struct v2f
	{
		float4 pos : SV_POSITION;
		float2 worldPos: TEXCOORD0;
		float4 color: TEXCOORD1;
		float isNull: TEXCOORD2;
		float2 uv: TEXCOORD3;
	};



	v2f vert(Input input, uint instanceID : SV_InstanceID)
	{
		float count = max(_lineCount - 1, 1);
		float texPos = instanceID / count;

		float4 indices = tex2Dlod(_indices, fixed4(texPos, 0, 0, 0));
		float4 startPos = tex2Dlod(_posStart, fixed4(indices.x, 0, 0, 0));
		float4 endPos = tex2Dlod(_posEnd, fixed4(indices.y, 0, 0, 0));

		float4 color = tex2Dlod(_color, fixed4(indices.b, 0, 0, 0));
		float transparency = color.a * _transparencyMultiplier;

		float3 dataOffset = float3(0.5, 0.5, 0);

		// vertices 0/2 -> start, 1/3 -> end
		uint pos = input.vertexId % 2;

		// => pos = 0 <=> start, pos = 1 <=> end
		float4x4 ltwMatrix = (1 - pos) * _startLocalToWorld + pos * _endLocalToWorld;
		float3 linePosition = (1 - pos) * float3(startPos.xy, 0) + pos * float3(endPos.xy, 0);

		// vertices 1/2 should be higher, 0/3 lower, to create appropriate line width
		float widthIndex = (((input.vertexId + 1) % 4) / 2 - 0.5) * 2;

		float3 lineWidthOffset = float3(0, widthIndex * _lineWidth, 0) * transparency;

		float3 isNullStart = tex2Dlod(_nullStart, float4(indices.x, 0, 0, 0));
		float3 isNullEnd = tex2Dlod(_nullEnd, float4(indices.y, 0, 0, 0));
		float3 isNull = (1 - pos) * isNullStart + pos * isNullEnd;
		float3 nullOffset = float3(_nullOffset, _nullOffset, _nullOffset);

		float3 localPosition = (isNull * nullOffset + (1 - isNull) * linePosition) - dataOffset;

		float4 worldPos = mul(ltwMatrix, float4(localPosition, 1));

		color.a = color.a * _transparencyMultiplier;

		v2f output;
		output.color = color;
		output.pos = UnityObjectToClipPos(worldPos) + float4(lineWidthOffset, 0);
		output.worldPos = worldPos;
		output.isNull = max(isNull.x, isNull.y);
		output.uv = TRANSFORM_TEX(input.uv, _color);
		return output;
	}



	ENDCG

	SubShader
	{
		Cull Off
		Lighting Off
		ZWrite On

		Blend SrcAlpha OneMinusSrcAlpha // Traditional transparency
		// Blend One OneMinusSrcAlpha // Premultiplied transparency
		// Blend One One // Additive
		// Blend OneMinusDstColor One // Soft Additive
		// Blend DstColor Zero // Multiplicative
		// Blend DstColor SrcColor // 2x Multiplicative

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

			fixed4 frag(v2f i) : SV_Target
			{
				// transparent lines are rendered in next pass
				clip(i.color.a - 0.9999);

				// null value -> dotted line
                float pos = i.uv.x * _dottedOffset;
                fixed value = floor(frac(pos) + 0.5);
                clip(value - 0.01 + step(i.isNull, 0.0001));

				return fixed4(i.color.xyz, 1);
			}

			ENDCG
		}

		Pass
		{
			Tags
			{
				"Queue" = "Transparent"
				"RenderType" = "Transparent"
				"IgnoreProjectors" = "True"
			}

			CGPROGRAM

			#pragma vertex vert
			#pragma fragment frag
			#pragma multi_compile_fwdbase nolightmap nodirlightmap nodynlightmap novertexlight
			#pragma multi_compile_instancing
			#pragma target 4.0

			fixed4 frag(v2f i) : SV_Target
			{
				// opaque lines are rendered in previous pass
				clip((1 - i.color.a) - 0.001);
				// remove completely transparent lines
				clip(i.color.a - 0.01);

				// null value -> dotted line
                float pos = i.uv.x * _dottedOffset;
                fixed value = floor(frac(pos) + 0.5);
                clip(value - 0.01 + step(i.isNull, 0.0001));

				return fixed4(i.color.xyz * i.color.a, i.color.a);
			}

			ENDCG
		}
	}
}