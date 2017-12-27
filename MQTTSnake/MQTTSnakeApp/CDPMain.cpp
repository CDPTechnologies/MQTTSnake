#include <CDPStarter.h>
#include <Libraries.h>

int main (int argc, char* argv[])
{
  int ret = 0;
  CDPStarter CDPMain(argc, argv);
  if (!CDPMain.hasArgument("--help"))
  {
    ret = CDPMain.Start();
    printf("Good Bye!\n");
  }
  else
    CDPMain.PrintHelp();

  return ret;
}
