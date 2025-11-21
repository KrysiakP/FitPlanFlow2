# Konfiguracja Scheduled Tasks (Cron Jobs)

## Przegląd

Aplikacja Panel Trenera wykorzystuje **Replit Scheduled Deployments** do uruchamiania zadań cyklicznych, takich jak sprawdzanie powiadomień o płatnościach.

**Dlaczego nie używamy schedulera przy starcie aplikacji?**
- Autoscale Deployments w Replit skalują instancje w górę i w dół w zależności od ruchu
- Uruchamianie ciężkich zadań (queries do bazy danych) przy starcie każdej instancji spowalnia inicjalizację
- Scheduled Deployments są dedykowane do zadań cyklicznych i nie wpływają na wydajność aplikacji

## Skonfigurowane zadania

### 1. Payment Notifications (Powiadomienia o płatnościach)

**Endpoint:** `POST /api/cron/payment-notifications`

**Opis:** Sprawdza niepłacone płatności i tworzy powiadomienia dla trenerów o:
- Płatnościach zaległych (overdue)
- Płatnościach dzisiaj (due_today)
- Płatnościach za 3 dni (upcoming)

**Harmonogram:** Co godzinę (zalecane)

## Konfiguracja

### Krok 1: Ustaw zmienną środowiskową CRON_JOB_TOKEN

1. Wygeneruj bezpieczny token (przykład):
   ```bash
   # W terminalu Replit
   openssl rand -hex 32
   ```

2. Dodaj token do Secrets w Replit:
   - Otwórz "Secrets" w panelu bocznym (ikona kłódki 🔒)
   - Dodaj nowy secret:
     - **Key:** `CRON_JOB_TOKEN`
     - **Value:** Wygenerowany token (np. `a1b2c3d4e5f6...`)
   - Kliknij "Add secret"

### Krok 2: Utwórz Scheduled Deployment

1. Otwórz zakładkę **Deployments** w Replit

2. Kliknij **"+ Create deployment"**

3. Wybierz **"Scheduled Deployment"**

4. Skonfiguruj deployment:
   
   **Nazwa:**
   ```
   Payment Notifications Hourly
   ```

   **Run command:**
   ```bash
   curl -X POST https://YOUR-APP-NAME.replit.app/api/cron/payment-notifications \
     -H "Authorization: Bearer ${CRON_JOB_TOKEN}" \
     -H "Content-Type: application/json"
   ```
   
   > **Ważne:** Zamień `YOUR-APP-NAME` na właściwą nazwę Twojej aplikacji!

   **Schedule (harmonogram):**
   
   Możesz wpisać po ludzku:
   ```
   every hour
   ```
   
   Lub użyć cron expression:
   ```
   0 * * * *
   ```
   (oznacza: o pełnej godzinie, każdej godziny, każdego dnia)

   **Timeout:** 
   ```
   60 seconds
   ```

   **Machine type:**
   ```
   Basic (wystarczające dla tego zadania)
   ```

5. Kliknij **"Create"** i **"Deploy"**

### Krok 3: Weryfikacja

Po utworzeniu Scheduled Deployment:

1. Sprawdź **Logs** w Deployments - powinny pojawić się logi z pierwszego uruchomienia
2. Powinna pojawić się odpowiedź JSON ze statystykami:
   ```json
   {
     "success": true,
     "timestamp": "2024-11-21T12:00:00.000Z",
     "stats": {
       "checked": 5,
       "created": 2,
       "skipped": 0,
       "errors": 0
     }
   }
   ```

## Testowanie manualne

Możesz przetestować endpoint cron ręcznie używając curl:

```bash
curl -X POST https://YOUR-APP-NAME.replit.app/api/cron/payment-notifications \
  -H "Authorization: Bearer YOUR_CRON_JOB_TOKEN" \
  -H "Content-Type: application/json"
```

**Oczekiwana odpowiedź (sukces):**
```json
{
  "success": true,
  "timestamp": "2024-11-21T12:34:56.789Z",
  "stats": {
    "checked": 10,
    "created": 3,
    "skipped": 1,
    "errors": 0
  }
}
```

**Oczekiwana odpowiedź (błędny token):**
```json
{
  "error": "Invalid cron job token"
}
```

## Monitorowanie

### Logi aplikacji

Sprawdź logi aplikacji w Replit Console:
- `[CRON] Running payment notifications check...` - rozpoczęcie zadania
- `[PAYMENT_NOTIFICATIONS] Completed: ...` - zakończenie ze statystykami

### Logi Scheduled Deployment

W zakładce **Deployments** > kliknij na deployment > **Logs**:
- Zobaczysz historię wszystkich uruchomień
- Możesz sprawdzić czy zadanie działa poprawnie
- W razie błędów zobaczysz szczegółowe komunikaty

## Troubleshooting

### Problem: "CRON_JOB_TOKEN not configured"

**Rozwiązanie:** Upewnij się że dodałeś secret `CRON_JOB_TOKEN` w Replit Secrets.

### Problem: "Invalid cron job token"

**Rozwiązanie:** 
- Sprawdź czy token w Scheduled Deployment command pasuje do tokenu w Secrets
- Upewnij się że nie ma dodatkowych spacji przed/po tokenie
- Token musi być przekazany jako `Bearer TOKEN` w headerze Authorization

### Problem: Deployment nie uruchamia się

**Rozwiązanie:**
- Sprawdź czy harmonogram (schedule) jest poprawnie skonfigurowany
- Upewnij się że aplikacja główna (Autoscale Deployment) jest uruchomiona
- Sprawdź logi Scheduled Deployment w zakładce Deployments

### Problem: "Failed to run payment notifications"

**Rozwiązanie:**
- Sprawdź logi aplikacji głównej - czy baza danych jest dostępna?
- Sprawdź czy `DATABASE_URL` jest poprawnie skonfigurowany w Secrets

## Dodawanie nowych zadań cyklicznych

Aby dodać nowe zadanie cykliczne:

1. **Utwórz serwis** w `server/services/yourService.ts`:
   ```typescript
   export async function yourTask(storage: IStorage): Promise<void> {
     // Twoja logika
   }
   ```

2. **Dodaj endpoint** w `server/routes.ts`:
   ```typescript
   app.post("/api/cron/your-task", async (req, res) => {
     // Sprawdź CRON_JOB_TOKEN (tak samo jak payment-notifications)
     // Wywołaj yourTask(storage)
     // Zwróć statystyki
   });
   ```

3. **Utwórz Scheduled Deployment** w Replit (zobacz Krok 2 powyżej)

## Najlepsze praktyki

✅ **DO:**
- Używaj Scheduled Deployments dla zadań cyklicznych
- Zawsze zabezpieczaj endpointy cron przez CRON_JOB_TOKEN
- Loguj statystyki wykonania zadania
- Ustaw rozsądny timeout (30-120 sekund)
- Testuj endpoint ręcznie przed konfiguracją schedulera

❌ **DON'T:**
- Nie uruchamiaj ciężkich zadań przy starcie aplikacji (`server/index.ts`)
- Nie używaj `setInterval` w aplikacji Autoscale
- Nie hardcode'uj tokenów w kodzie - używaj Secrets
- Nie twórz endpointów cron bez autoryzacji

## Więcej informacji

- [Replit Scheduled Deployments Documentation](https://docs.replit.com/deployments/scheduled-deployments)
- [Autoscale Best Practices](https://docs.replit.com/deployments/autoscale-deployments)
