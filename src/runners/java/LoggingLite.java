// ===================== Logger-lite (SLF4J / Log4j 2) =====================
// Dołączany tylko, gdy kod importuje org.slf4j lub org.apache.logging.log4j.

final class Logger {
  private final String name;
  Logger(String name) { this.name = name; }
  public String getName() { return name; }
  public boolean isTraceEnabled() { return true; }
  public boolean isDebugEnabled() { return true; }
  public boolean isInfoEnabled() { return true; }
  public boolean isWarnEnabled() { return true; }
  public boolean isErrorEnabled() { return true; }
  public void trace(String msg, Object... args) { log("TRACE", msg, args); }
  public void debug(String msg, Object... args) { log("DEBUG", msg, args); }
  public void info(String msg, Object... args) { log("INFO", msg, args); }
  public void warn(String msg, Object... args) { log("WARN", msg, args); }
  public void error(String msg, Object... args) { log("ERROR", msg, args); }
  public void fatal(String msg, Object... args) { log("FATAL", msg, args); }
  public void trace(Object msg) { log("TRACE", String.valueOf(msg)); }
  public void debug(Object msg) { log("DEBUG", String.valueOf(msg)); }
  public void info(Object msg) { log("INFO", String.valueOf(msg)); }
  public void warn(Object msg) { log("WARN", String.valueOf(msg)); }
  public void error(Object msg) { log("ERROR", String.valueOf(msg)); }

  private void log(String level, String msg, Object... args) {
    StringBuilder sb = new StringBuilder();
    int argIdx = 0;
    String m = msg == null ? "null" : msg;
    for (int i = 0; i < m.length(); i++) {
      char c = m.charAt(i);
      if (c == '{' && i + 1 < m.length() && m.charAt(i + 1) == '}' && argIdx < args.length && !(argIdx == args.length - 1 && args[argIdx] instanceof Throwable && countPlaceholders(m) <= argIdx)) {
        Object a = args[argIdx++];
        sb.append(a instanceof Object[] ? java.util.Arrays.deepToString((Object[]) a) : String.valueOf(a));
        i++;
      } else sb.append(c);
    }
    String time = java.time.LocalTime.now().format(java.time.format.DateTimeFormatter.ofPattern("HH:mm:ss.SSS"));
    System.out.println(time + " [" + Thread.currentThread().getName() + "] " + String.format("%-5s", level) + " " + name + " - " + sb);
    if (args.length > argIdx && args[args.length - 1] instanceof Throwable) {
      ((Throwable) args[args.length - 1]).printStackTrace(System.out);
    }
  }

  private static int countPlaceholders(String m) {
    int n = 0;
    for (int i = 0; i + 1 < m.length(); i++) if (m.charAt(i) == '{' && m.charAt(i + 1) == '}') n++;
    return n;
  }
}

final class LoggerFactory {
  static Logger getLogger(Class<?> c) { return new Logger(c.getSimpleName()); }
  static Logger getLogger(String name) { return new Logger(name); }
}

final class LogManager {
  static Logger getLogger(Class<?> c) { return new Logger(c.getSimpleName()); }
  static Logger getLogger(String name) { return new Logger(name); }
  static Logger getLogger() {
    StackTraceElement[] st = new Throwable().getStackTrace();
    String cls = st.length > 1 ? st[1].getClassName() : "root";
    return new Logger(cls.contains(".") ? cls.substring(cls.lastIndexOf('.') + 1) : cls);
  }
}
