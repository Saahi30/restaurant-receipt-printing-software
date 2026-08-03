param(
  [Parameter(Mandatory = $true)][string]$PrinterName,
  [Parameter(Mandatory = $true)][string]$FilePath
)

# Sends raw ESC/POS bytes straight to a Windows printer queue (RAW datatype).
# This bypasses the driver's rendering and print dialog entirely — fully silent.

$code = @"
using System;
using System.Runtime.InteropServices;

public class RawPrinterHelper {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public struct DOCINFOW {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }

  [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string src, out IntPtr hPrinter, IntPtr pd);
  [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr hPrinter, int level, ref DOCINFOW di);
  [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr hPrinter);
  [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, int dwCount, out int dwWritten);

  public static string SendBytes(string printerName, byte[] bytes) {
    IntPtr hPrinter;
    DOCINFOW di = new DOCINFOW();
    di.pDocName = "Receipt";
    di.pDataType = "RAW";
    if (!OpenPrinter(printerName, out hPrinter, IntPtr.Zero))
      return "OpenPrinter failed (" + Marshal.GetLastWin32Error() + ")";
    string result = "OK";
    try {
      if (!StartDocPrinter(hPrinter, 1, ref di)) return "StartDocPrinter failed (" + Marshal.GetLastWin32Error() + ")";
      try {
        if (!StartPagePrinter(hPrinter)) return "StartPagePrinter failed (" + Marshal.GetLastWin32Error() + ")";
        IntPtr p = Marshal.AllocCoTaskMem(bytes.Length);
        try {
          Marshal.Copy(bytes, 0, p, bytes.Length);
          int written;
          if (!WritePrinter(hPrinter, p, bytes.Length, out written))
            result = "WritePrinter failed (" + Marshal.GetLastWin32Error() + ")";
          else if (written != bytes.Length)
            result = "Short write: " + written + "/" + bytes.Length;
        } finally {
          Marshal.FreeCoTaskMem(p);
          EndPagePrinter(hPrinter);
        }
      } finally {
        EndDocPrinter(hPrinter);
      }
    } finally {
      ClosePrinter(hPrinter);
    }
    return result;
  }
}
"@

Add-Type -TypeDefinition $code -Language CSharp | Out-Null

$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$result = [RawPrinterHelper]::SendBytes($PrinterName, $bytes)

if ($result -eq "OK") {
  Write-Output "OK"
  exit 0
} else {
  Write-Error $result
  exit 1
}
