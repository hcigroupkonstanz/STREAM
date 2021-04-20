using Cysharp.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using UniRx;
using UnityEngine;
using UnityEngine.Networking;

namespace Assets.Modules.Networking
{
    public static class RestAPI
    {
        public static async UniTask<JArray> Get(string url)
        {
            await WebServerConnection.Instance.Connected;
            var fullUrl = Combine($"http://{WebServerAddress.Current}:8080/api/", url);
            var result = await GetJsonAsync(UnityWebRequest.Get(fullUrl));
            return result;
        }

        private static async UniTask<JArray> GetJsonAsync(UnityWebRequest req)
        {
            var op = await req.SendWebRequest();

            if (op.isHttpError || op.isNetworkError)
            {
                Debug.LogError(op.error);
                return null;
            }

            var text = op.downloadHandler.text;
            try
            {
                return JsonConvert.DeserializeObject(text) as JArray;
            }
            catch (Exception e)
            {
                Debug.LogError(e.Message);
                Debug.LogError(text);
                return null;
            }
        }


        // see https://stackoverflow.com/a/1476563/4090817
        private static string Combine(string uri1, string uri2)
        {
            uri1 = uri1.TrimEnd('/');
            uri2 = uri2.TrimStart('/');
            return string.Format("{0}/{1}", uri1, uri2);
        }
    }
}
