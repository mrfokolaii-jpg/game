# Photon Integration Notes

We integrate Photon PUN2 for multiplayer to get a fast, reliable online stack that supports voice via Photon Voice.

Steps:
1. Create a free Photon account at https://www.photonengine.com and create a new Photon PUN app to get AppId.
2. In Unity, import Photon PUN 2 - Free package (Package Manager or Asset Store).
3. In Unity Editor: Window → Photon Unity Networking → PUN Wizard, paste AppId and set region.
4. Use PhotonManager.cs as the bootstrap to connect and join lobby.
5. Use PhotonNetwork.Instantiate("PlayerPrefab", spawnPos, Quaternion.identity) to spawn networked players.
6. For voice: import Photon Voice and follow its setup docs.

Security:
- Do not commit AppId or secret keys to repo. Use Unity cloud variables or CI secrets for automated builds.
