// UIManager.cs
using UnityEngine;
using UnityEngine.UI;

namespace SegaRiot.UI
{
    public class UIManager : MonoBehaviour
    {
        [Header("HUD")]
        public Text playerIdText;
        public Text healthText;
        public Text ammoText;

        [Header("Menus")]
        public GameObject mainMenu;
        public GameObject multiplayerMenu;
        public GameObject inGameHUD;

        void Start()
        {
            ShowMainMenu();
        }

        public void ShowMainMenu()
        {
            mainMenu.SetActive(true);
            multiplayerMenu.SetActive(false);
            inGameHUD.SetActive(false);
        }

        public void ShowMultiplayerMenu()
        {
            mainMenu.SetActive(false);
            multiplayerMenu.SetActive(true);
            inGameHUD.SetActive(false);
        }

        public void ShowInGameHUD()
        {
            mainMenu.SetActive(false);
            multiplayerMenu.SetActive(false);
            inGameHUD.SetActive(true);
        }

        public void UpdateHUD(string playerId, int health, int ammo)
        {
            if (playerIdText) playerIdText.text = playerId;
            if (healthText) healthText.text = $"HP: {health}";
            if (ammoText) ammoText.text = $"Ammo: {ammo}";
        }
    }
}
