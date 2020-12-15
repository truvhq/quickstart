using System;

namespace c_sharp
{
  public class BridgeTokenSettings {
    public string company_mapping_id { get; set; }
  }

  public class BridgeToken {

    public string bridge_token { get; set; }
    public BridgeTokenSettings settings { get; set; }

  }

}