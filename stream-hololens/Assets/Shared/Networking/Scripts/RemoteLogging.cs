using Assets.Modules.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Networking
{
    public class RemoteLogging : MonoBehaviour
    {
        private struct LogMsg
        {
            public string Type;
            public string Message;
            public LogMsg(string type, string msg)
            {
                Type = type;
                Message = msg;
            }
        }
        private readonly LockFreeQueue<LogMsg> _messages = new LockFreeQueue<LogMsg>();
        private readonly Subject<int> _msgSubject = new Subject<int>();

        private bool _isSending = false;

        void OnEnable()
        {
            Application.logMessageReceivedThreaded += OnLogMessage;
            _msgSubject
                .TakeUntilDisable(this)
                .Where(_ => !_isSending)
                .Sample(TimeSpan.FromSeconds(1))
                .Subscribe(_ => SendLog());
        }

        void OnDisable()
        {
            Application.logMessageReceivedThreaded -= OnLogMessage;
        }

        private void OnLogMessage(string condition, string stackTrace, LogType type)
        {
            string logType;

            switch (type)
            {
                case LogType.Log:
                    logType = "info";
                    break;

                case LogType.Warning:
                    logType = "warning";
                    break;

                case LogType.Error:
                case LogType.Exception:
                    logType = "error";
                    break;

                case LogType.Assert:
                default:
                    logType = "debug";
                    break;
            }

            var msg = condition;
            if (type == LogType.Error || type == LogType.Exception)
                msg += "\n" + stackTrace;

            _messages.Enqueue(new LogMsg(logType, msg));

            // start sendMessages timer
            _msgSubject.OnNext(0);
        }

        private void SendLog()
        {
            _isSending = true;
            var sendTask = Observable.Start(() =>
            {
                if (WebServerConnection.HasInstance)
                {
                    var msgs = new List<LogMsg>();
                    while (_messages.Dequeue(out var logMsg))
                    {
                        // skip duplicated messages
                        if (!msgs.Any(l => l.Message == logMsg.Message))
                            msgs.Add(logMsg);
                    }

                    var hasSent = true;
                    foreach (var msg in msgs)
                    {
                        if (hasSent)
                            hasSent = WebServerConnection.Instance.SendCommandSync(NetworkChannel.LOG, msg.Type, msg.Message);

                        if (!hasSent)
                            _messages.Enqueue(msg);
                    }

                    return hasSent;
                }
                else
                {
                    return false;
                }
            });

            Observable
                .WhenAll(sendTask)
                .TakeUntilDisable(this)
                .ObserveOnMainThread()
                .Subscribe(result => {
                    _isSending = false;
                    if (!result[0])
                        _msgSubject.OnNext(0);
                });
        }
    }
}
