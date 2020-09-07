////////////////////////////////////////////////////////////////////////////////////////////////////
//                               This file is part of CosmoScout VR                               //
//      and may be used under the terms of the MIT license. See the LICENSE file for details.     //
//                        Copyright: (c) 2019 German Aerospace Center (DLR)                       //
////////////////////////////////////////////////////////////////////////////////////////////////////

#include "IncidentNode.hpp"
#include "../../../../src/cs-utils/filesystem.hpp"
#include "../NodeEditor/NodeEditor.hpp"
#include "../Plugin.hpp"

#include <curlpp/Easy.hpp>
#include <curlpp/Info.hpp>
#include <curlpp/Infos.hpp>
#include <curlpp/Options.hpp>

IncidentNode::IncidentNode(cs::gui::GuiItem* pItem, int id)
    : VNE::Node(pItem, id) {
}

IncidentNode::~IncidentNode() {
}

std::string IncidentNode::GetName() {
  return "IncidentNode";
}

void IncidentNode::Init(VNE::NodeEditor* pEditor) {
  csp::vestec::logger().debug("[" + GetName() + "] Init");

  const std::string node =
      cs::utils::filesystem::loadToString("../share/resources/gui/js/csp-vestec-incident-node.js");
  pEditor->GetGuiItem()->executeJavascript(node);

  pEditor->GetGuiItem()->registerCallback("downloadDataSet", "Downloads a given Dataset",
      std::function([](std::string uuid, std::string token) {
        // TODO make configurable
        std::string   dl("../share/vestec/download/" + uuid);

        if (cs::utils::filesystem::fileExists(dl)) {
          return;
        }

        std::ofstream out;

        out.open(dl, std::ofstream::out | std::ofstream::binary);

        if (!out) {
          csp::vestec::logger().error("Failed to download vestec dataset '{}'.", uuid);
          return;
        }

        std::list<std::string> header;
        header.push_back("Authorization: Bearer " + token);

        auto url = csp::vestec::Plugin::vestecServer + "/flask/data/" + uuid;

        csp::vestec::logger().debug("Downloading '{}' to '{}'", url, dl);

        curlpp::Easy request;
        request.setOpt(curlpp::options::HttpHeader(header));
        request.setOpt(curlpp::options::Url(url));
        request.setOpt(curlpp::options::WriteStream(&out));
        request.setOpt(curlpp::options::NoSignal(true));

        request.perform();

        out.close();
      }));
}
