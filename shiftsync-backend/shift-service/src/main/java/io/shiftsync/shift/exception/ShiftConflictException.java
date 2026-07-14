package io.shiftsync.shift.exception;

public class ShiftConflictException extends RuntimeException {
    
    private final String errorCode;

    public ShiftConflictException(String errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }

    public String getErrorCode() {
        return errorCode;
    }
}
