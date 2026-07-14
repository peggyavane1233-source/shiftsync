package io.shiftsync.common.dto;

public class ErrorResponse {
    private String error;
    private String message;
    private String traceId;
    private Object details;

    public ErrorResponse() {}

    public ErrorResponse(String error, String message, String traceId) {
        this.error = error;
        this.message = message;
        this.traceId = traceId;
    }

    public ErrorResponse(String error, String message, String traceId, Object details) {
        this.error = error;
        this.message = message;
        this.traceId = traceId;
        this.details = details;
    }

    public String getError() { return error; }
    public void setError(String error) { this.error = error; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getTraceId() { return traceId; }
    public void setTraceId(String traceId) { this.traceId = traceId; }

    public Object getDetails() { return details; }
    public void setDetails(Object details) { this.details = details; }
}
