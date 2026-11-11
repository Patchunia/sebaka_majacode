package com.sebaka.emailcode.api;

import com.sebaka.emailcode.service.EmailCodeService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/email-codes")
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
