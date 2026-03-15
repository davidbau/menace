C Trace instrumentation for Zork parity testing
C Include this file in routines that need tracing.
C Activated by -DTRACE_PARITY compiler flag.

#ifdef TRACE_PARITY
C Write trace line to stderr (unit 0)
C Format: TRACE:<tag>:<values>
#define TRACE_PARSE(A,P,O,I,PP,QQ) WRITE(0,'(A,I6,A,I6,A,I6,A,I6,A,I6)') 'TRACE:PARSE:act=',A,' prsa=',P,' prso=',O,' prsi=',I,' prep=',PP
#define TRACE_STATE(H,W,M,S) WRITE(0,'(A,I6,A,I6,A,I6,A,I6)') 'TRACE:STATE:here=',H,' winner=',W,' moves=',M,' score=',S
#define TRACE_VAPPLI(V,R) WRITE(0,'(A,I6,A,L1)') 'TRACE:VAPPLI:verb=',V,' result=',R
#define TRACE_INPUT(BUF,LEN) WRITE(0,'(A,A)') 'TRACE:INPUT:',BUF(1:LEN)
#define TRACE_SYNMCH(J,V) WRITE(0,'(A,I6,A,I6)') 'TRACE:SYNMCH:j=',J,' verb=',V
#define TRACE_SPARSE_VERB(K,J) WRITE(0,'(A,I6,A,I6)') 'TRACE:SPARSE_VERB:wordidx=',K,' vvocidx=',J
#define TRACE_OBJACT(O,R) WRITE(0,'(A,I6,A,L1)') 'TRACE:OBJACT:obj=',O,' result=',R
#define TRACE_RAPPLI(R,V) WRITE(0,'(A,I6,A,L1)') 'TRACE:RAPPLI:room=',R,' result=',V
#define TRACE_OUTPUT(BUF) WRITE(0,'(A,A)') 'TRACE:OUTPUT:',TRIM(BUF)
#define TRACE_ENDSTEP() WRITE(0,'(A)') 'TRACE:ENDSTEP'
#else
#define TRACE_PARSE(A,P,O,I,PP,QQ)
#define TRACE_STATE(H,W,M,S)
#define TRACE_VAPPLI(V,R)
#define TRACE_INPUT(BUF,LEN)
#define TRACE_SYNMCH(J,V)
#define TRACE_SPARSE_VERB(K,J)
#define TRACE_OBJACT(O,R)
#define TRACE_RAPPLI(R,V)
#define TRACE_OUTPUT(BUF)
#define TRACE_ENDSTEP()
#endif
