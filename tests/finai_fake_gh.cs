// Disposable GitHub CLI substitute for Windows bootstrap QA. No network.
using System;
using System.IO;
using System.Linq;

public static class FinaiFakeGh
{
    public static int Main(string[] args)
    {
        string mode = Environment.GetEnvironmentVariable("FINAI_FAKE_GH_MODE") ?? "ok";
        string audit = Environment.GetEnvironmentVariable("FINAI_FAKE_GH_AUDIT");
        string all = string.Join(" ", args);
        if (args.Length == 0) return 2;
        if (args[0] == "api")
        {
            if (all.Contains("api user")) { Console.WriteLine("synthetic"); return 0; }
            if (all.Contains(".permissions.admin")) { Console.WriteLine("true"); return 0; }
            if (all.Contains("environments?per_page=100"))
            {
                Console.WriteLine("{\"total_count\":2,\"environments\":[{\"name\":\"finai-staging\"},{\"name\":\"finai-production\"}]}");
                return 0;
            }
            if (all.Contains("deployment-branch-policies"))
            {
                Console.WriteLine("{\"branch_policies\":[{\"name\":\"main\"}]}"); return 0;
            }
            if (all.Contains("/environments/"))
            {
                Console.WriteLine("{\"deployment_branch_policy\":{\"custom_branch_policies\":" + (mode == "unsafe-policy" ? "false" : "true") + "}}"); return 0;
            }
            return 3;
        }
        if (args[0] == "variable" && args.Length > 1 && args[1] == "list")
        {
            Console.WriteLine(mode == "enabled-flag" ? "[{\"name\":\"FINAI_AUTO_PUBLISH_ENABLED\",\"value\":\"true\"}]" : "[]"); return 0;
        }
        if (args[0] == "secret" && args.Length > 1 && args[1] == "list")
        {
            Console.WriteLine(mode == "existing-secret" ? "[{\"name\":\"FINAI_DEPLOY_SSH_PRIVATE_KEY\"}]" : "[]"); return 0;
        }
        if (args[0] == "variable" && args.Length > 2 && args[1] == "set")
        {
            File.AppendAllText(audit, "variable " + args[2] + "\n"); return 0;
        }
        if (args[0] == "secret" && args.Length > 2 && args[1] == "set")
        {
            string value = Console.In.ReadToEnd();
            bool valid = args[2] == "FINAI_DEPLOY_SSH_PRIVATE_KEY"
                ? value.Contains("-----BEGIN OPENSSH PRIVATE KEY-----")
                : args[2] == "FINAI_DEPLOY_SSH_KNOWN_HOSTS" && value.StartsWith("lcp-86.controlpanel.si ssh-ed25519 ");
            if (!valid) return 4;
            File.AppendAllText(audit, "secret " + args[2] + "\n");
            return mode == "secret-fail" && all.Contains("finai-production") ? 5 : 0;
        }
        return 6;
    }
}
