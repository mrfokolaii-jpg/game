// PhotonManager.cs
// This file provides a starting integration with Photon PUN 2 (recommended for fast multiplayer & voice)
using Photon.Pun;
using Photon.Realtime;
using UnityEngine;

namespace SegaRiot.Net
{
    public class PhotonManager : MonoBehaviourPunCallbacks
    {
        public static PhotonManager Instance;
        public string gameVersion = "1";

        void Awake()
        {
            if (Instance == null) Instance = this;
            else Destroy(gameObject);
            DontDestroyOnLoad(gameObject);
        }

        void Start()
        {
            Connect();
        }

        public void Connect()
        {
            if (!PhotonNetwork.IsConnected)
            {
                PhotonNetwork.GameVersion = gameVersion;
                PhotonNetwork.ConnectUsingSettings();
                Debug.Log("Connecting to Photon...");
            }
        }

        public override void OnConnectedToMaster()
        {
            Debug.Log("Connected to Photon Master server");
            PhotonNetwork.JoinLobby();
        }

        public override void OnJoinedLobby()
        {
            Debug.Log("Joined Lobby");
        }

        public void CreateRoom(string roomName)
        {
            PhotonNetwork.CreateRoom(roomName, new RoomOptions { MaxPlayers = 4 });
        }

        public void JoinRoom(string roomName)
        {
            PhotonNetwork.JoinRoom(roomName);
        }

        public override void OnJoinedRoom()
        {
            Debug.Log("Joined Room: " + PhotonNetwork.CurrentRoom.Name);
            // Spawn player prefab using PhotonNetwork.Instantiate when ready
        }
    }
}
