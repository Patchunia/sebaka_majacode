# Email code API

Spring Boot API that generates a six-digit verification code and emails it to the address in the request. The code is sent by email only; it is not included in the API response.

## Run

Requires Java 21 and Maven:

```sh
mvn spring-boot:run
```

Configure an SMTP server using environment variables before starting the API. The defaults (`localhost:1025`, no authentication) are only suitable when a local SMTP test server is running; they do not send mail to real inboxes.

| Variable | Default | Description |
| --- | --- | --- |
| `MAIL_HOST` | `localhost` | SMTP server hostname |
| `MAIL_PORT` | `1025` | SMTP server port |
| `MAIL_USERNAME` | empty | SMTP username |
| `MAIL_PASSWORD` | empty | SMTP password |
| `MAIL_SMTP_AUTH` | `false` | Enable SMTP authentication |
| `MAIL_SMTP_STARTTLS` | `false` | Enable STARTTLS |
| `MAIL_FROM` | `no-reply@example.com` | Sender address |
| `SERVER_PORT` | `8080` | HTTP port |

For example, Gmail SMTP uses `MAIL_HOST=smtp.gmail.com`, `MAIL_PORT=587`, `MAIL_SMTP_AUTH=true`, and `MAIL_SMTP_STARTTLS=true`. Set `MAIL_USERNAME` to your full Gmail address, `MAIL_PASSWORD` to a Google app password, and `MAIL_FROM` to an address permitted by your provider. Use a provider-issued app password where required; do not commit credentials. Restart the API after changing environment variables.

## Request

```http
POST /api/v1/email-codes
Content-Type: application/json

{"email":"person@example.com"}
```

On success, the API responds with HTTP `200` and:

```json
{"message":"Verification code sent."}
```

An invalid or blank email is rejected with HTTP `400`. If SMTP delivery fails, the API responds with HTTP `502` and does not expose SMTP details. The server log contains the underlying mail error; check it for connection, authentication, TLS, or sender-address issues.

## Test

```sh
mvn test
```
