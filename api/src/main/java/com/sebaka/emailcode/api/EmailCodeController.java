package com.sebaka.emailcode.api;

import com.sebaka.emailcode.service.EmailCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/email-codes")
// LOCAL TEST ONLY (not committed to the repo): allow the browser tab served
// from http://localhost:8000 or http://127.0.0.1:8000 to call this API.
// Without a CORS setting the browser blocks the request before it reaches
// Spring. Note "localhost" and "127.0.0.1" are distinct origins, so both are
// listed. The back-end team should add a proper CORS configuration before the
// front-end goes live.
@CrossOrigin(origins = { "http://localhost:8000", "http://127.0.0.1:8000" })
public class EmailCodeController {

    private final EmailCodeService emailCodeService;

    public EmailCodeController(EmailCodeService emailCodeService) {
        this.emailCodeService = emailCodeService;
    }

    @PostMapping
    public ResponseEntity<EmailCodeResponse> sendCode(@Valid @RequestBody EmailCodeRequest request) {
        emailCodeService.sendCode(request.email());
        return ResponseEntity.ok(new EmailCodeResponse("Verification code sent."));
    }
}
