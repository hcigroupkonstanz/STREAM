using Assets.Modules.Core;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using UniRx;
using UnityEngine;

namespace Assets.Modules.Networking
{
    public enum ConnectionStatus { Connected, Disconnected, Connecting, Reconnecting };

    [DefaultExecutionOrder(-100)]
    public class WebServerConnection : SingletonBehaviour<WebServerConnection>
    {
#if MIDAIR_TRACKING
        const int UNITY_SERVER_PORT = 8836;
#elif MIDAIR_AR
        const int UNITY_SERVER_PORT = 8835;
#endif
        const int BUFFER_SIZE = 10 * 1024 * 1024;
        const long HEARTBEAT_TIMEOUT_THRESHOLD_MS = 10000;
        const int SOCKET_TIMEOUT_MS = 2000;
        const int RECONNECT_DELAY_MS = 5 * 1000;

        private static Socket _socket;
        private static AsyncCallback _receiveCallback = new AsyncCallback(ReceiveData);
        private static byte[] _receiveBuffer = new byte[BUFFER_SIZE];
        private static int _receiveBufferOffset = 0;
        private static int _expectedPacketSize = -1;

        private static UTF8Encoding _encoding = new UTF8Encoding();

        public event Action OnConnected;
        public event Action OnDisconnected;

        public static readonly Subject<InPacket> ServerMessagesAsync = new Subject<InPacket>();

        private ArtsClient _me;
        private Task _connectionTask;
        private static long LastHeartbeatTime;

        // WARNING: fired from non-main thread!
        public BehaviorSubject<ConnectionStatus> NetworkStatus = new BehaviorSubject<ConnectionStatus>(ConnectionStatus.Disconnected);

        private BehaviorSubject<bool> _isConnected = new BehaviorSubject<bool>(false);
        public IObservable<bool> Connected => _isConnected.Where(x => x).First();


        // workaround to execute events in main unity thread
        private bool fireOnConnected;
        private bool fireOnDisconnected;
        private ConnectionStatus _status = ConnectionStatus.Disconnected;
        public ConnectionStatus Status
        {
            get { return _status; }
            private set
            {
                if (_status != value)
                {
                    NetworkStatus.OnNext(value);

                    _status = value;
                    if (_status == ConnectionStatus.Connected)
                    {
                        fireOnConnected = true;
                        _isConnected.OnNext(true);
                    }
                    else
                    {
                        _isConnected.OnNext(false);
                    }

                    if (_status == ConnectionStatus.Disconnected)
                        fireOnDisconnected = true;
                }
            }
        }


        private struct PacketHeader
        {
            public int PacketSize;
            public int PacketStartOffset;
            public bool IsHeartbeat;
        }

        public struct InPacket
        {
            public int channel;
            public string command;
            public JToken payload;
        }


        private struct OutPacket
        {
            public int channel;
            public string command;
            public JToken payload;
        }


        private void OnEnable()
        {
            WebServerAddress.OnAdressChange += Reconnect;
            _me = ArtsClient.Instance;

            if (!String.IsNullOrEmpty(WebServerAddress.Current))
                Connect();

            // to get rid of unity warning
            var blah = new InPacket
            {
                channel = 0,
                command = "",
                payload = null
            };
        }

        private void OnDisable()
        {
            if (_socket != null)
                _socket.Dispose();
            _socket = null;
            WebServerAddress.OnAdressChange -= Reconnect;
        }

        private void Reconnect()
        {
            if (_socket != null)
            {
                try
                {
                    _socket.Disconnect(false);
                }
                catch (Exception e)
                {
                    Debug.LogWarning(e.Message);
                }

                _socket.Dispose();
                _socket = null;
            }

            Status = ConnectionStatus.Disconnected;

            Connect();
        }

        private void Connect()
        {
            Status = ConnectionStatus.Connecting;
            bool isReconnect = _socket != null;

            if (_socket != null)
                _socket.Dispose();

            _socket = new Socket(AddressFamily.InterNetwork, SocketType.Stream, ProtocolType.Tcp);
            _socket.NoDelay = true;
            _socket.ReceiveTimeout = SOCKET_TIMEOUT_MS;
            _socket.SendTimeout = SOCKET_TIMEOUT_MS;

            // avoid multithreading problems due to variable changes...
            var ip = WebServerAddress.Current;
            var socket = _socket;


            Task.Run(async () =>
            {
                if (isReconnect)
                {
                    Status = ConnectionStatus.Reconnecting;
                    await Task.Delay(RECONNECT_DELAY_MS);
                }

                try
                {
                    _receiveBufferOffset = 0;
                    _expectedPacketSize = -1;

                    socket.Connect(ip, UNITY_SERVER_PORT);
                    socket.BeginReceive(_receiveBuffer, _receiveBufferOffset, _receiveBuffer.Length - _receiveBufferOffset, SocketFlags.None, _receiveCallback, null);
                    SendCommandSync(NetworkChannel.REGISTRATION, "register", _me.Name);
                    Debug.Log("Connection to web server established");
                    Status = ConnectionStatus.Connected;
                    LastHeartbeatTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
                }
                catch (SocketException ex)
                {
                    Debug.LogError(ex.Message);
                    Debug.Log($"Unable to connect to server {ip}, trying again in a few seconds...");
                    Status = ConnectionStatus.Disconnected;
                }
            });

        }

        private void Update()
        {
            if (fireOnConnected)
            {
                OnConnected?.Invoke();
                fireOnConnected = false;
            }

            if (fireOnDisconnected)
            {
                OnDisconnected?.Invoke();
                fireOnDisconnected = false;
            }

            if (Status == ConnectionStatus.Connected)
            {
                if (Math.Abs(LastHeartbeatTime - DateTimeOffset.Now.ToUnixTimeMilliseconds()) > HEARTBEAT_TIMEOUT_THRESHOLD_MS)
                {
                    Status = ConnectionStatus.Disconnected;
                    Debug.Log("Connection lost, trying to reconnect...");
                }
            }

            if (Status == ConnectionStatus.Disconnected && !String.IsNullOrEmpty(WebServerAddress.Current))
            {
                Connect();
            }
        }


        private static void ReceiveData(IAsyncResult asyncResult)
        {
            try
            {
                if (_socket == null)
                    return;

                int numReceived = _socket.EndReceive(asyncResult);
                Debug.Assert(numReceived >= 0, "Received negative amount of bytes from surface connection");

                var processingOffset = 0;
                var bufferEnd = _receiveBufferOffset + numReceived;

                while (processingOffset < bufferEnd)
                {
                    if (_expectedPacketSize <= 0)
                    {
                        if (HasPacketHeader(processingOffset))
                        {
                            var header = GetPacketHeader(processingOffset);

                            if (header.IsHeartbeat)
                            {
                                LastHeartbeatTime = DateTimeOffset.Now.ToUnixTimeMilliseconds();
                                processingOffset += header.PacketSize;
                            }
                            else
                            {
                                processingOffset = header.PacketStartOffset;
                                _expectedPacketSize = header.PacketSize;
                            }
                        }
                        else
                        {
                            Debug.LogWarning("Invalid packet received, skipping ahead!");
                            while (processingOffset < bufferEnd && !HasPacketHeader(processingOffset))
                            {
                                processingOffset++;
                            }

                        }
                    }
                    else if (processingOffset + _expectedPacketSize <= bufferEnd)
                    {
                        byte[] rawPacket = new byte[_expectedPacketSize];
                        Buffer.BlockCopy(_receiveBuffer, processingOffset, rawPacket, 0, rawPacket.Length);
                        var packet = _encoding.GetString(rawPacket);

                        try
                        {
                            // messages have to be handled in main update() thread, to avoid possible threading issues in handlers
                            if (packet.Length > 0)
                            {
                                var incomingPacket = JsonConvert.DeserializeObject<InPacket>(packet);
                                ServerMessagesAsync.OnNext(incomingPacket);
                            }
                        }
                        catch (Exception e)
                        {
                            Debug.LogException(e);
                            Debug.LogError(packet);
                        }

                        processingOffset += _expectedPacketSize;
                        _expectedPacketSize = -1;
                    }
                    else
                    {
                        // neither header nor complete package
                        // -> currently incomplete packet in buffer, wait for rest
                        break;
                    }
                }

                if (processingOffset == bufferEnd)
                {
                    // cleared buffer entirely, no need to rearrange memory due to incomplete packet
                    _receiveBufferOffset = 0;
                }
                else
                {
                    // incomplete packet in buffer, move to front
                    _receiveBufferOffset = Math.Max(0, bufferEnd - processingOffset);
                    Buffer.BlockCopy(_receiveBuffer, processingOffset, _receiveBuffer, 0, _receiveBufferOffset);
                }


                if (_receiveBuffer.Length - _receiveBufferOffset < 100)
                {
                    var error = "Receive buffer getting too small, aborting receive";
                    Debug.LogError(error);
                    throw new OverflowException(error);
                }

                _socket.BeginReceive(_receiveBuffer, _receiveBufferOffset, _receiveBuffer.Length - _receiveBufferOffset, SocketFlags.None, _receiveCallback, null);
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
        }


        /*
         *  Message format:
         *  \0\0\0 (Packet header as string) \0 (Actual packet json string)
         */

        private static bool HasPacketHeader(int offset)
        {
            if (offset + 2 >= _receiveBuffer.Length)
            {
                return false;
            }

            if (_receiveBuffer[offset] == '\0' &&
                _receiveBuffer[offset + 1] == '\0' &&
                _receiveBuffer[offset + 2] == '\0')
            {
                return true;
            }

            return false;
        }

        private static PacketHeader GetPacketHeader(int offset)
        {
            var start = offset + 3;
            var end = start;

            if (_receiveBuffer[start] == 'h')
            {
                return new PacketHeader
                {
                    PacketSize = 5,
                    IsHeartbeat = true
                };
            }

            while (end < _receiveBuffer.Length && _receiveBuffer[end] != '\0')
            {
                // searching ...
                end++;
            }

            if (end >= _receiveBuffer.Length)
            {
                throw new OverflowException("Receive buffer overflow");
            }

            // don't want to deal with integer formatting, so it's transmitted as text instead
            byte[] packetSizeRaw = new byte[end - start + 1];
            Buffer.BlockCopy(_receiveBuffer, start, packetSizeRaw, 0, packetSizeRaw.Length);
            var packetSizeText = _encoding.GetString(packetSizeRaw);

            return new PacketHeader
            {
                PacketSize = int.Parse(packetSizeText),
                PacketStartOffset = end + 1,
                IsHeartbeat = false
            };
        }



        private void SendDataAsync(byte[] data)
        {
            if (_socket != null)
            {
                SocketAsyncEventArgs socketAsyncData = new SocketAsyncEventArgs();
                socketAsyncData.SetBuffer(data, 0, data.Length);
                _socket.SendAsync(socketAsyncData);
            }
        }

        private bool SendData(byte[] data)
        {
            try
            {
                _socket.Send(data);
                return true;
            }
            catch (Exception e)
            {
                Debug.LogError(e.Message);
            }

            return false;
        }

        public void SendCommand(int channel, string command, JToken payload)
        {
            var packet = new OutPacket
            {
                channel = channel,
                command = command,
                payload = payload
            };

            var encoding = new UTF8Encoding();
            var rawData = encoding.GetBytes(JsonConvert.SerializeObject(packet));
            SendDataAsync(rawData);
        }

        public bool SendCommandSync(int channel, string command, JToken payload)
        {
            var packet = new OutPacket
            {
                channel = channel,
                command = command,
                payload = payload
            };

            var encoding = new UTF8Encoding();
            var rawData = encoding.GetBytes(JsonConvert.SerializeObject(packet));

            return SendData(rawData);
        }
    }
}
